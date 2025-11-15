// firebase_config.js
// Initializes Firebase and exposes `window.db` for pages that expect it.
// Replace the values below with your project's config if different.
(function() {
  // Firebase config for rsu-safespace (used by verification pages)
  // NOTE: keep this file out of public repos if these keys are sensitive for your workflow.
  require('dotenv').config();
  
  var firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
  };

  try {
    if (!window.firebase) {
      console.warn('Firebase SDK not loaded yet. Ensure firebase-app.js and firebase-auth.js are included before firebase_config.js.');
    }

    if (window.firebase && !firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
      console.log('Firebase initialized');
    }

    // Expose database reference for pages that expect `window.db`
    if (window.firebase && firebase.database) {
      window.db = firebase.database();
    }

    // Lightweight global incoming-call notifier
    // Listens for consultations belonging to the signed-in student and shows a browser
    // notification when a counselor sets roomStatus === 1. This runs on any page that
    // includes firebase_config.js (index.html, messages.html, etc.) so the
    // student will receive notifications even when the chat page isn't open.
    try{
      if (window.firebase && firebase.auth && window.db){
        const _notified = {}; // consultId -> boolean
        firebase.auth().onAuthStateChanged(user => {
          // clear previous listener if any
          if (window._globalConsultListenerRef){ try{ window._globalConsultListenerRef.off(); }catch(e){} window._globalConsultListenerRef = null; }
          if (!user) return;
          const uid = user.uid;
          // Listen to consultations root and filter client-side (keeps compatibility with many data shapes)
          const ref = window.db.ref('consultations');
          window._globalConsultListenerRef = ref;
          ref.on('value', snap => {
            const all = snap.val() || {};
            Object.keys(all).forEach(k => {
              const c = all[k] || {};
              // resolve student id heuristically (match many possible fields)
              function consultStudentId(cobj){
                const studentFields = ['studentId','student_id','student_uid','studentUid','student'];
                for (let f of studentFields){ if (cobj && cobj[f]) return String(cobj[f]); }
                if (cobj && cobj.student && typeof cobj.student === 'object'){
                  return cobj.student.uid || cobj.student.id || null;
                }
                return null;
              }
              const sid = consultStudentId(c);
              if (!sid || String(sid) !== String(uid)) return; // not this student's consultation

              // detect canonical room
              const candidates = [c.videoRoom, c.jitsiRoom, c.room, c.video_room, c.video_url, c.meetRoom, c.meetingUrl, c.meeting_link, c.meetingRoom, c.roomName];
              let room = candidates.find(Boolean);
              if (!room && c.meta) room = c.meta.room || c.meta.videoRoom || c.meta.meetingRoom;

              const status = (c.roomStatus !== undefined && c.roomStatus !== null) ? Number(c.roomStatus) : null;

              // Show notification when status transitions to 1
              if (status === 1 && !_notified[k]){
                _notified[k] = true;
                // request permission early when needed
                if (typeof Notification !== 'undefined' && Notification.permission === 'default'){
                  Notification.requestPermission().catch(()=>{});
                }

                // Helper: show an on-page incoming-call modal when messages.html's modal isn't available
                function showSiteIncomingCall(caller, roomId, consultId){
                  try{
                    // If the current page has a messages-specific helper, prefer it
                    if (window.showIncomingCall && typeof window.showIncomingCall === 'function'){
                      try{ window.showIncomingCall(caller || 'Counselor', roomId || '', consultId || ''); return; } catch(e){}
                    }

                    // Avoid showing multiple modals for the same consult
                    window._siteIncomingShown = window._siteIncomingShown || {};
                    if (window._siteIncomingShown[consultId]) return;
                    window._siteIncomingShown[consultId] = true;

                    // Create modal HTML (minimal inline styles so it works across pages)
                    const id = 'site-incoming-call-full-' + String(consultId).replace(/[^a-z0-9_-]/ig,'');
                    if (document.getElementById(id)) return;
                    const html = `
                      <div id="${id}" style="position:fixed;inset:0;background:linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.6));z-index:99999;display:flex;align-items:center;justify-content:center;">
                        <div style="width:100%;max-width:760px;height:500px;border-radius:12px;overflow:hidden;box-shadow:0 14px 40px rgba(2,6,23,0.6);display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#b3f0d7,#70d7a8);position:relative;">
                          <div style="position:absolute;top:18px;right:18px;color:rgba(255,255,255,0.85);font-size:14px;">Incoming call</div>
                          <div style="text-align:center;max-width:560px;margin:auto;padding:36px;">
                            <div style="width:120px;height:120px;border-radius:999px;background:#fff;margin:0 auto 18px;box-shadow:0 8px 18px rgba(0,0,0,0.12);"></div>
                            <div style="font-size:28px;color:#ffffff;font-weight:800;text-shadow:0 2px 6px rgba(0,0,0,0.15);">${escapeHtml(caller || 'Counselor')}</div>
                            <div style="color:rgba(255,255,255,0.95);margin-top:6px;margin-bottom:26px;">Video call</div>

                            <div style="display:flex;gap:36px;justify-content:center;align-items:center;margin-top:6px;">
                              <button id="${id}_decline" aria-label="Decline" style="width:84px;height:84px;border-radius:999px;border:none;background:#ef4444;color:#fff;display:flex;align-items:center;justify-content:center;font-size:28px;box-shadow:0 8px 18px rgba(0,0,0,0.15);cursor:pointer;">
                                <!-- X icon -->
                                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 6L18 18M6 18L18 6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                              </button>

                              <button id="${id}_answer" aria-label="Answer" style="width:96px;height:96px;border-radius:999px;border:6px solid rgba(255,255,255,0.85);background:#10b981;color:#fff;display:flex;align-items:center;justify-content:center;font-size:32px;box-shadow:0 10px 24px rgba(16,185,129,0.28);cursor:pointer;">
                                <!-- Camera icon -->
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 10.5L19 8V16L15 13.5" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><rect x="3" y="6" width="12" height="12" rx="2" stroke="white" stroke-width="1.6"/></svg>
                              </button>
                            </div>

                            <div style="margin-top:18px;color:rgba(255,255,255,0.95);font-size:13px;">Open Messages to join the call or press Answer</div>
                          </div>
                        </div>
                      </div>
                    `;
                    const wrapper = document.createElement('div'); wrapper.innerHTML = html;
                    document.body.appendChild(wrapper.firstElementChild);

                    // helpers: start ringtone and title flash
                    startSiteRingtone(); startFlashTitle();

                    // answer -> navigate directly to the video room page
                    document.getElementById(id + '_answer').addEventListener('click', function(){
                      stopSiteRingtone(); stopFlashTitle();
                      try{
                        // prefer opening the dedicated full-screen video page which auto-initializes Jitsi
                        const consultParam = encodeURIComponent(consultId || '');
                        const roomParam = roomId ? ('&room=' + encodeURIComponent(roomId)) : '';
                        const nameParam = (typeof caller === 'string' && caller) ? ('&name=' + encodeURIComponent(caller)) : '';
                        // open in same tab so popups are not blocked
                        window.location.href = 'video.html?consult=' + consultParam + roomParam + nameParam;
                      }catch(e){
                        // fallback to messages view if something goes wrong
                        try{ const consultParam = encodeURIComponent(consultId || ''); const roomParam = roomId ? ('&room=' + encodeURIComponent(roomId)) : ''; window.location.href = 'messages.html?consult=' + consultParam + roomParam; }catch(e){}
                      }
                    });

                    // decline -> clear DB and remove modal
                    document.getElementById(id + '_decline').addEventListener('click', async function(){
                      stopSiteRingtone(); stopFlashTitle();
                      try{
                        if (consultId && window.db){
                          await window.db.ref('consultations/' + consultId).update({ roomStatus: 0, clearedBy: 'student_decline', clearedAt: Date.now() });
                        }
                      }catch(e){ console.warn('decline clear failed', e); }
                      const el = document.getElementById(id); if (el) el.remove();
                      try{ delete window._siteIncomingShown[consultId]; }catch(e){}
                    });

                    // remove modal if user navigates away
                    window.addEventListener('beforeunload', function(){ const el = document.getElementById(id); if (el) el.remove(); });
                  }catch(e){ console.warn('site incoming call show failed', e); }
                }

                // small escaping helper for inline HTML
                function escapeHtml(str){ return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

                // Ringtone & title flash helpers (simple, low dependency)
                window._siteRingtone = window._siteRingtone || {audioCtx:null,osc:null,interval:null};
                function startSiteRingtone(){
                  try{
                    if (window._siteRingtone.playing) return; window._siteRingtone.playing = true;
                    const AudioCtx = window.AudioContext || window.webkitAudioContext;
                    if (!AudioCtx) return;
                    const ctx = new AudioCtx(); window._siteRingtone.audioCtx = ctx;
                    const o = ctx.createOscillator(); const g = ctx.createGain();
                    o.type = 'sine'; o.frequency.value = 880; // start
                    g.gain.value = 0.0001; // start very low to avoid autoplay rejection spike
                    o.connect(g); g.connect(ctx.destination);
                    o.start();
                    // ramp up and play a quick motif loop
                    let step = 0; window._siteRingtone.interval = setInterval(()=>{
                      const freqs = [880, 988, 1047, 880];
                      const f = freqs[step % freqs.length];
                      try{ o.frequency.setValueAtTime(f, ctx.currentTime); g.gain.cancelScheduledValues(ctx.currentTime); g.gain.setValueAtTime(0.12, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6); }catch(e){}
                      step++;
                    }, 700);
                    window._siteRingtone.osc = o;
                  }catch(e){ console.warn('startSiteRingtone failed', e); }
                }
                function stopSiteRingtone(){
                  try{
                    window._siteRingtone.playing = false;
                    if (window._siteRingtone.interval) clearInterval(window._siteRingtone.interval);
                    if (window._siteRingtone.osc){ try{ window._siteRingtone.osc.stop(); }catch(e){} window._siteRingtone.osc.disconnect(); }
                    if (window._siteRingtone.audioCtx){ try{ window._siteRingtone.audioCtx.close(); }catch(e){} }
                    window._siteRingtone = {audioCtx:null,osc:null,interval:null};
                  }catch(e){ }
                }

                // Title flash
                window._siteTitleFlash = window._siteTitleFlash || { timer: null, original: document.title };
                function startFlashTitle(){ try{ if (window._siteTitleFlash.timer) return; window._siteTitleFlash.original = document.title; let on = false; window._siteTitleFlash.timer = setInterval(()=>{ document.title = (on ? 'Incoming call… ' : window._siteTitleFlash.original); on = !on; }, 1000); }catch(e){} }
                function stopFlashTitle(){ try{ if (window._siteTitleFlash.timer) clearInterval(window._siteTitleFlash.timer); document.title = window._siteTitleFlash.original || document.title; window._siteTitleFlash.timer = null; }catch(e){} }

                // First show browser notification (if allowed)
                try{
                  if (typeof Notification !== 'undefined' && Notification.permission === 'granted'){
                    const title = (c.counselorName || 'Counselor') + ' — Video call';
                    const body = (c.counselorName ? c.counselorName + ' is calling you' : 'Incoming video call');
                    const n = new Notification(title, { body, tag: k, renotify: true });
                    n.onclick = function(){ try{ window.focus(); const consultParam = encodeURIComponent(k); const roomParam = room ? ('&room=' + encodeURIComponent(room)) : ''; window.location.href = 'messages.html?consult=' + consultParam + roomParam; }catch(e){} try{ this.close(); }catch(e){} };
                    setTimeout(()=>{ try{ n.close(); }catch(e){} }, 12000);
                  }
                }catch(e){ console.warn('global notification failed', e); }

                // Then ensure the in-page modal appears (either by delegating to messages.html's helper or injecting one here)
                try{ showSiteIncomingCall(c.counselorName || 'Counselor', room, k); }catch(e){ console.warn('showSiteIncomingCall error', e); }
              }

                // Expose the site helper so pages (like messages.html) can delegate to it
                try{ if (typeof showSiteIncomingCall === 'function') window.showSiteIncomingCall = showSiteIncomingCall; }catch(e){}

              // Clear notified flag when status goes back to 0
              if (status === 0 && _notified[k]){
                delete _notified[k];
              }
            });
          });
        });
      }
    }catch(e){ console.warn('global notifier init failed', e); }

    // Also make firebase available globally if not already
    window.firebase = window.firebase || firebase;
  } catch (err) {
    console.error('Error initializing Firebase in firebase_config.js', err);
  }

})();


