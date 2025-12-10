// notification.js - Utility for handling browser notifications in SafeSpace

// Check if notifications are allowed for a specific type
function isNotificationAllowed(type) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return false;
  }
  if (window.notificationSettings) {
    return window.notificationSettings[type] !== false;
  }
  return true; // default true if not loaded yet
}

// Request notification permission if not already granted
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

// Show a notification if allowed
function showNotification(title, body, icon = '/safespace.png', tag = '') {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    console.warn('Notifications not supported or permission not granted');
    return;
  }

  const options = {
    body: body,
    icon: icon,
    tag: tag, // Prevents duplicate notifications with same tag
    requireInteraction: false
  };

  const notification = new Notification(title, options);

  // Auto-close after 5 seconds
  setTimeout(() => {
    notification.close();
  }, 5000);

  // Handle click to focus window
  notification.onclick = function() {
    window.focus();
    notification.close();
  };

  return notification;
}

// Specific notification functions
function showAppointmentNotification(message) {
  if (isNotificationAllowed('appointment')) {
    showNotification('SafeSpace - Appointment', message, '/safespace.png', 'appointment');
  }
}

function showMessageNotification(message) {
  console.log('showMessageNotification called with message:', message);
  
  // Check if message notifications are allowed (for in-app notifications)
  // We allow in-app notifications even if browser notifications aren't granted
  const settingsAllowed = !window.notificationSettings || window.notificationSettings.message !== false;
  console.log('Message notifications settings allowed:', settingsAllowed);
  console.log('window.notificationSettings:', window.notificationSettings);
  
  if (!settingsAllowed) {
    console.log('Message notifications not allowed by settings');
    return;
  }
  
  console.log('Message notifications are allowed, proceeding...');
  
  // Show browser notification
  if ('Notification' in window && Notification.permission === 'granted') {
    console.log('Showing browser notification for message');
    showNotification('SafeSpace - New Message', message, '/safespace.png', 'message');
  } else {
    console.log('Browser notification not available or not granted, permission:', Notification.permission);
  }
  
  // Show in-app notification
  console.log('Calling showInAppNotification for message');
  showInAppNotification(message, () => {
    // Navigate to messages page
    console.log('Message notification clicked, navigating to messages');
    window.location.href = 'messages.html';
  }, null, { type: 'message' });
}

function showCallNotification(message) {
  if (isNotificationAllowed('call')) {
    showNotification('SafeSpace - Incoming Call', message, '/safespace.png', 'call');
  }
}

function showSlotsNotification(message) {
  console.log('showSlotsNotification called with message:', message);
  
  // Slot notifications are always allowed (important for booking availability)
  // Removed permission check to ensure users always get notified of new slots
  
  // Show browser notification
  if ('Notification' in window && Notification.permission === 'granted') {
    console.log('Showing browser notification');
    showNotification('SafeSpace - New Slots Available', message, '/safespace.png', 'slots');
  } else {
    console.log('Browser notification not available or not granted');
  }
  
  // Show in-app notification
  console.log('Calling showInAppNotification');
  showInAppNotification(message, () => {
    // Navigate to calendar section
    console.log('Notification clicked, scrolling to calendar section');
    const calendarEl = document.getElementById('calendar');
    if (calendarEl) {
      calendarEl.scrollIntoView({ behavior: 'smooth' });
    }
    // Close notification dropdown
    const dropdown = document.getElementById('notifDropdown');
    if (dropdown) {
      dropdown.classList.remove('active');
    }
  });
}

function showResultNotification(message) {
  if ('Notification' in window && Notification.permission === 'granted') {
    showNotification('SafeSpace - Assessment Result', message, '/safespace.png', 'result');
  }
}

function showResourceNotification(message) {
  console.log('showResourceNotification called with message:', message);
  
  // Resource notifications are always allowed (important educational content)
  
  // Show browser notification
  if ('Notification' in window && Notification.permission === 'granted') {
    console.log('Showing browser notification for resource');
    showNotification('SafeSpace - New Resource Available', message, '/safespace.png', 'resource');
  } else {
    console.log('Browser notification not available or not granted');
  }
  
  // Show in-app notification
  console.log('Calling showInAppNotification for resource');
  showInAppNotification(message, () => {
    // Navigate to resources page
    console.log('Resource notification clicked, navigating to resources');
    window.location.href = 'resources.html';
  });
}

function showMoodReminderNotification() {
  const message = 'Good morning! Don\'t forget to log your mood for today!';
  const today = new Date().toDateString();
  
  // Show browser notification if permission granted
  if ('Notification' in window && Notification.permission === 'granted') {
    showNotification('SafeSpace - Daily Mood Check', 'Take a moment to log how you\'re feeling today!', '/safespace.png', 'mood');
  }
  
  // Show persistent in-app notification with date tracking
  showInAppNotification(message, () => {
    // Navigate to assessments page for mood logging
    console.log('Mood notification clicked, navigating to assessments');
    window.location.href = 'assessments.html';
  }, null, { type: 'mood_reminder', date: today });
}

// Daily mood reminder scheduling
function scheduleMoodReminders() {
  // Clear old mood notifications on startup
  clearOldMoodNotifications();
  
  // Check if we should show mood reminder
  function checkMoodReminder() {
    // Clear old mood notifications first
    clearOldMoodNotifications();
    
    const currentUser = firebase.auth().currentUser;
    console.log('checkMoodReminder: currentUser =', currentUser ? currentUser.uid : 'null');
    if (!currentUser) {
      console.log('checkMoodReminder: No current user, skipping');
      return;
    }
    
    // Check if notification DOM elements exist
    const list = document.querySelector('.notif-list');
    const noNotifs = document.getElementById('no-notifs');
    if (!list || !noNotifs) {
      console.log('checkMoodReminder: Notification DOM elements not found, skipping');
      return;
    }
    
    const now = new Date();
    const hour = now.getHours();
    const today = now.toDateString();
    
    console.log('checkMoodReminder: hour =', hour, 'today =', today);
    
    // Only show between 8 AM and 11 AM
    if (hour < 8 || hour > 11) {
      console.log('checkMoodReminder: Outside reminder hours, skipping');
      return;
    }
    
    // Check Firebase for mood status
    const uid = currentUser.uid;
    window.db.ref('students').child(uid).child('moodStatus').once('value').then(snapshot => {
      const moodStatus = snapshot.val() || {};
      
      // Check if mood already logged today
      if (moodStatus.lastMoodLogged === today) {
        return; // Mood already logged today
      }
      
      // Check if already shown today
      if (moodStatus.lastReminderShown === today) {
        return; // Already shown today
      }
      
      console.log('Showing daily mood reminder');
      showMoodReminderNotification();
      
      // Mark as shown today in Firebase
      window.db.ref('students').child(uid).child('moodStatus').update({
        lastReminderShown: today
      });
    }).catch(err => {
      console.warn('Failed to check mood status:', err);
    });
  }
  
  // Check immediately
  checkMoodReminder();
  
  // Check every hour
  setInterval(checkMoodReminder, 60 * 60 * 1000); // 1 hour
}

// Clear mood reminder notification (call this when mood is logged)
function clearMoodReminder() {
  console.log('Clearing mood reminder notification');
  
  // Remove from inAppNotifications if it exists
  if (window.inAppNotifications) {
    window.inAppNotifications = window.inAppNotifications.filter(notif => 
      !notif.message.includes('Don\'t forget to log your mood for today')
    );
    
    // Update Firebase
    const currentUser = firebase.auth().currentUser;
    if (currentUser && window.notificationSettings) {
      const updatedSettings = { ...window.notificationSettings, inAppNotifications: window.inAppNotifications };
      window.db.ref('student_notif').child(currentUser.uid).set(updatedSettings);
    }
    
    // Update UI
    updateBadgeVisibility();
  }
  
  // Mark as completed for today in Firebase
  const currentUser = firebase.auth().currentUser;
  if (currentUser) {
    const today = new Date().toDateString();
    window.db.ref('students').child(currentUser.uid).child('moodStatus').update({
      lastMoodLogged: today
    }).catch(err => {
      console.warn('Failed to update mood status:', err);
    });
  }
}

// Clear old mood notifications from previous days
function clearOldMoodNotifications() {
  console.log('Clearing old mood notifications');
  
  if (!window.inAppNotifications) return;
  
  const today = new Date().toDateString();
  const initialCount = window.inAppNotifications.length;
  
  // Remove mood notifications that are not from today
  window.inAppNotifications = window.inAppNotifications.filter(notif => {
    if (notif.metadata && notif.metadata.type === 'mood_reminder') {
      // Keep only today's mood notification
      return notif.metadata.date === today;
    }
    // Keep all non-mood notifications
    return true;
  });
  
  const finalCount = window.inAppNotifications.length;
  if (initialCount !== finalCount) {
    console.log(`Cleared ${initialCount - finalCount} old mood notifications`);
    
    // Update Firebase if user is logged in
    const currentUser = firebase.auth().currentUser;
    if (currentUser && window.notificationSettings) {
      const updatedSettings = { ...window.notificationSettings, inAppNotifications: window.inAppNotifications };
      window.db.ref('student_notif').child(currentUser.uid).set(updatedSettings);
      
      // Update UI
      updateBadgeVisibility();
    }
  }
}

// Initialize on load - request permission if any notifications are enabled
document.addEventListener('DOMContentLoaded', function() {
  const appointmentAllowed = isNotificationAllowed('appointment');
  const messageAllowed = isNotificationAllowed('message');
  const callAllowed = isNotificationAllowed('call');

  if (appointmentAllowed || messageAllowed || callAllowed) {
    requestNotificationPermission();
  }
  
  // Clear old mood notifications from previous days
  clearOldMoodNotifications();
  
  // Start daily mood reminder scheduling
  scheduleMoodReminders();
});

// Show in-app notification in the dropdown
function showInAppNotification(message, onclick, consultId = null, metadata = {}) {
  console.log('showInAppNotification called with message:', message, 'consultId:', consultId, 'metadata:', metadata);
  
  // Check for duplicate notifications using consultation ID if available
  if (consultId && window.inAppNotifications && window.inAppNotifications.some(n => n.consultId === consultId)) {
    console.log('Duplicate notification detected for consultId:', consultId, 'skipping');
    return; // Skip if notification for this consultation already exists
  }
  
  // Check for duplicate mood reminders for the same day
  if (metadata.type === 'mood_reminder' && metadata.date && window.inAppNotifications) {
    const existingMoodNotif = window.inAppNotifications.find(n => 
      n.metadata && n.metadata.type === 'mood_reminder' && n.metadata.date === metadata.date
    );
    if (existingMoodNotif) {
      console.log('Duplicate mood reminder for date:', metadata.date, 'skipping');
      return;
    }
  }
  
  // Fallback to message-based duplicate checking with shorter time window
  if (window.inAppNotifications && window.inAppNotifications.some(n => n.message === message && (Date.now() - n.timestamp) < 5000)) {
    console.log('Duplicate notification detected by message, skipping');
    return; // Skip if a similar notification was added within the last 5 seconds
  } else {
    console.log('No duplicate detected, proceeding');
  }

  const currentUser = firebase.auth().currentUser;
  console.log('showInAppNotification called with message:', message, 'consultId:', consultId, 'metadata:', metadata);
  console.log('Current user:', currentUser ? currentUser.uid : 'null');
  
  if (currentUser) {
    const uid = currentUser.uid;
    // Add to inAppNotifications
    const notifId = Date.now() + Math.random();
    const newNotif = { id: notifId, message, timestamp: Date.now(), consultId, metadata };
    if (!window.inAppNotifications) window.inAppNotifications = [];
    window.inAppNotifications.push(newNotif);
    console.log('Added notification to inAppNotifications array, total:', window.inAppNotifications.length);
    
    // Update database
    const updatedSettings = { ...window.notificationSettings, inAppNotifications: window.inAppNotifications };
    console.log('Updating database with settings:', updatedSettings);
    window.db.ref('student_notif').child(uid).set(updatedSettings);

    const list = document.querySelector('.notif-list');
    const noNotifs = document.getElementById('no-notifs');
    const dropdown = document.getElementById('notifDropdown');
    
    console.log('DOM elements found - list:', !!list, 'noNotifs:', !!noNotifs, 'dropdown:', !!dropdown);
    console.log('Dropdown active state:', dropdown ? dropdown.classList.contains('active') : 'dropdown not found');
    
    if (list && noNotifs) {
      // Hide no notifications
      noNotifs.style.display = 'none';
      console.log('Hidden no-notifications element');
      console.log('noNotifs display style:', noNotifs.style.display);
      console.log('noNotifs computed style display:', window.getComputedStyle(noNotifs).display);

      const item = document.createElement('div');
      item.className = 'notif-item';
      item.textContent = message;
      item.dataset.id = notifId;
      console.log('Created notification item with id:', notifId);
      console.log('Item text content:', item.textContent);
      console.log('Item className:', item.className);
      
      item.onclick = function() {
        console.log('Notification clicked');
        if (onclick) onclick();
        item.remove();
        // Remove from inAppNotifications and update database
        if (window.inAppNotifications) {
          window.inAppNotifications = window.inAppNotifications.filter(n => n.id != notifId);
          const currentUser = firebase.auth().currentUser;
          if (currentUser) {
            const updatedSettings = { ...window.notificationSettings, inAppNotifications: window.inAppNotifications };
            window.db.ref('student_notif').child(currentUser.uid).set(updatedSettings);
          }
        }
        updateBadgeVisibility();
      };
      list.appendChild(item);
      console.log('Added notification item to list');
      console.log('Current list children count:', list.children.length);
      console.log('List children:', Array.from(list.children).map(child => ({ id: child.id, className: child.className, textContent: child.textContent.substring(0, 50) })));

      // Show badge only if dropdown is not active
      if (dropdown && !dropdown.classList.contains('active')) {
        console.log('Updating badge visibility');
        updateBadgeVisibility();
      } else {
        console.log('Dropdown is active, not updating badge');
      }

      console.log('Final state - noNotifs display:', noNotifs.style.display, 'computed:', window.getComputedStyle(noNotifs).display);
      console.log('Final list HTML:', list.innerHTML.substring(0, 200));

      // Auto-dismiss mood notifications after 24 hours
      if (metadata.type === 'mood_reminder') {
        setTimeout(() => {
          console.log('Auto-dismissing mood notification after 24 hours');
          item.remove();
          // Remove from inAppNotifications and update database
          if (window.inAppNotifications) {
            window.inAppNotifications = window.inAppNotifications.filter(n => n.id != notifId);
            const currentUser = firebase.auth().currentUser;
            if (currentUser) {
              const updatedSettings = { ...window.notificationSettings, inAppNotifications: window.inAppNotifications };
              window.db.ref('student_notif').child(currentUser.uid).set(updatedSettings);
            }
          }
          updateBadgeVisibility();
        }, 24 * 60 * 60 * 1000); // 24 hours
      }

      // Auto-dismiss message notifications after 1 hour
      if (metadata.type === 'message') {
        setTimeout(() => {
          console.log('Auto-dismissing message notification after 1 hour');
          item.remove();
          // Remove from inAppNotifications and update database
          if (window.inAppNotifications) {
            window.inAppNotifications = window.inAppNotifications.filter(n => n.id != notifId);
            const currentUser = firebase.auth().currentUser;
            if (currentUser) {
              const updatedSettings = { ...window.notificationSettings, inAppNotifications: window.inAppNotifications };
              window.db.ref('student_notif').child(currentUser.uid).set(updatedSettings);
            }
          }
          updateBadgeVisibility();
        }, 60 * 60 * 1000); // 1 hour
      }
    } else {
      console.log('DOM elements not found, cannot display notification');
    }
  } else {
    console.log('No current user, cannot show in-app notification');
  }
}

function updateBadgeVisibility() {
  console.log('updateBadgeVisibility called');
  const list = document.querySelector('.notif-list');
  const badge = document.querySelector('.notif-badge');
  const noNotifs = document.getElementById('no-notifs');
  console.log('Elements found - list:', !!list, 'badge:', !!badge, 'noNotifs:', !!noNotifs);
  
  if (list && badge && noNotifs) {
    const children = Array.from(list.children);
    console.log('List children:', children.map(c => ({ id: c.id, className: c.className, display: window.getComputedStyle(c).display })));
    const hasItems = list.children.length > 1 || (list.children.length === 1 && list.children[0] !== noNotifs);
    console.log('hasItems calculation:', hasItems, 'children.length:', list.children.length, 'first child is noNotifs:', list.children[0] === noNotifs);
    
    if (hasItems) {
      badge.classList.remove('hidden');
      noNotifs.style.display = 'none';
      console.log('Showing badge, hiding no-notifs');
    } else {
      badge.classList.add('hidden');
      noNotifs.style.display = 'block';
      console.log('Hiding badge, showing no-notifs');
    }
    
    console.log('Final badge classList:', badge.className);
    console.log('Final noNotifs display:', noNotifs.style.display, 'computed:', window.getComputedStyle(noNotifs).display);
  } else {
    console.log('Missing elements for updateBadgeVisibility');
  }
}

// Initialize badge visibility
document.addEventListener('DOMContentLoaded', function() {
  updateBadgeVisibility();
});

// Function to display stored notifications in the DOM
function displayStoredNotifications() {
  console.log('displayStoredNotifications called');
  
  // First clear old mood notifications
  clearOldMoodNotifications();
  
  if (!window.inAppNotifications || !Array.isArray(window.inAppNotifications)) {
    console.log('No stored notifications to display');
    return;
  }
  
  const list = document.querySelector('.notif-list');
  const noNotifs = document.getElementById('no-notifs');
  
  if (!list || !noNotifs) {
    console.log('Notification DOM elements not found');
    return;
  }
  
  console.log('Displaying', window.inAppNotifications.length, 'stored notifications');
  
  // Clear existing notifications (keep only the "no notifications" message)
  Array.from(list.children).forEach(child => {
    if (child !== noNotifs) {
      child.remove();
    }
  });
  
  // Display each stored notification
  window.inAppNotifications.forEach(notif => {
    const item = document.createElement('div');
    item.className = 'notif-item';
    item.textContent = notif.message;
    item.dataset.id = notif.id;
    
    item.onclick = function() {
      console.log('Stored notification clicked');
      // Remove from DOM
      item.remove();
      // Remove from array
      if (window.inAppNotifications) {
        window.inAppNotifications = window.inAppNotifications.filter(n => n.id != notif.id);
      }
      // Update database
      const currentUser = firebase.auth().currentUser;
      if (currentUser) {
        const updatedSettings = { ...window.notificationSettings, inAppNotifications: window.inAppNotifications };
        window.db.ref('student_notif').child(currentUser.uid).set(updatedSettings);
      }
      updateBadgeVisibility();
    };
    
    list.appendChild(item);
  });
  
  // Update visibility
  updateBadgeVisibility();
}

// Function to set appointment reminders
function setupAppointmentReminders(appointment) {
  if (!appointment || !appointment.date || !appointment.time) return;

  // Check if appointment notifications are allowed (for in-app)
  const settingsAllowed = !window.notificationSettings || window.notificationSettings.appointment !== false;
  if (!settingsAllowed) return;

  // Get counselor name - try multiple fields
  let counselorName = appointment && appointment.counselor_name;
  if (!counselorName && appointment && appointment.counselor) {
    counselorName = `${appointment.counselor.first_name || ''} ${appointment.counselor.last_name || ''}`.trim();
  }
  if (!counselorName && window.allCounselors) {
    const counselor = window.allCounselors.find(c => 
      c.uid === appointment.counselor_uid || 
      c.key === appointment.counselor_key ||
      c.uid === appointment.counselorId ||
      c.key === appointment.counselorId
    );
    if (counselor) {
      counselorName = `${counselor.first_name} ${counselor.last_name}`;
    }
  }
  if (!counselorName) counselorName = 'Your counselor';

  // Parse appointment time (assuming parseLocalDateTime is available globally)
  const dateStr = String(appointment.date);
  const timeStr = String(appointment.time).split(' - ')[0] || '';
  const appointmentTime = window.parseLocalDateTime ? window.parseLocalDateTime(dateStr, timeStr) : new Date(dateStr + 'T' + timeStr);
  if (isNaN(appointmentTime.getTime())) return;

  const now = new Date();
  const timeDiff = appointmentTime.getTime() - now.getTime();

  // Only set reminders for appointments within the next 24 hours
  if (timeDiff <= 0 || timeDiff > 24 * 60 * 60 * 1000) return;

  // Set reminders for 15, 10, 5 minutes before
  const reminderTimes = [15, 10, 5];
  reminderTimes.forEach(minutes => {
    const reminderTime = timeDiff - (minutes * 60 * 1000);
    if (reminderTime > 0) {
      setTimeout(() => {
        showInAppNotification(
          `Reminder: Your session with ${counselorName} starts in ${minutes} minute${minutes > 1 ? 's' : ''}.`,
          () => {
            // Navigate to index.html appointments section
            window.location.href = 'index.html';
          }
        );
      }, reminderTime);
    }
  });
}

// Function to show notification when session starts
function showSessionStartNotification(appointment) {
  // Check if appointment notifications are allowed (for in-app)
  const settingsAllowed = !window.notificationSettings || window.notificationSettings.appointment !== false;
  if (!settingsAllowed) return;

  // Get counselor name - try multiple fields
  let counselorName = appointment && appointment.counselor_name;
  if (!counselorName && appointment && appointment.counselor) {
    counselorName = `${appointment.counselor.first_name || ''} ${appointment.counselor.last_name || ''}`.trim();
  }
  if (!counselorName && window.allCounselors) {
    const counselor = window.allCounselors.find(c => 
      c.uid === appointment.counselor_uid || 
      c.key === appointment.counselor_key ||
      c.uid === appointment.counselorId ||
      c.key === appointment.counselorId
    );
    if (counselor) {
      counselorName = `${counselor.first_name} ${counselor.last_name}`;
    }
  }
  if (!counselorName) counselorName = 'Your counselor';

  showInAppNotification(`${counselorName} has started your session. Click to join!`, () => {
    // Navigate to join the session - this would need to be handled by the calling code
    // For now, just navigate to index.html
    window.location.href = 'index.html';
  });
}

// Real-time notification listeners
let slotListeners = new Set(); // Track active slot listeners
let appointmentListeners = new Set(); // Track active appointment listeners
let resourceListeners = new Set(); // Track active resource listeners
let messageListeners = new Set(); // Track active message listeners
let realtimeSetupTime = 0; // Track when real-time setup was completed

// Function to set up real-time slot availability monitoring
function setupRealtimeSlotMonitoring(counselorUids) {
  if (!counselorUids || !Array.isArray(counselorUids)) {
    console.log('setupRealtimeSlotMonitoring: No counselor UIDs provided');
    return;
  }

  console.log('Setting up real-time slot monitoring for counselors:', counselorUids);

  // Clear existing listeners
  slotListeners.forEach(unsubscribe => unsubscribe());
  slotListeners.clear();

  counselorUids.forEach(counselorUid => {
    if (!counselorUid) {
      console.log('Skipping empty counselor UID');
      return;
    }

    console.log(`Setting up listener for counselor: ${counselorUid}`);

    // Listen for any changes to weekly ranges (more reliable than child_added/removed)
    const weeklyRangesRef = window.db.ref(`availabilities/${counselorUid}/weeklyRanges`);
    const valueListener = weeklyRangesRef.on('value', (snapshot) => {
      const now = Date.now();
      const timeSinceSetup = now - realtimeSetupTime;
      
      // Ignore initial call and calls within first 5 seconds after setup
      if (timeSinceSetup < 5000) {
        console.log(`Ignoring weekly ranges change for ${counselorUid} (too soon after setup: ${timeSinceSetup}ms)`);
        return;
      }
      
      console.log(`📅 Weekly ranges changed for counselor ${counselorUid} (${timeSinceSetup}ms after setup)`);
      // Trigger refresh of availability data to detect new slots
      if (window.loadAllAvailabilities) {
        console.log('Refreshing availability data due to weekly ranges change...');
        window.loadAllAvailabilities();
      } else {
        console.error('window.loadAllAvailabilities not available');
      }
    });
    slotListeners.add(() => {
      console.log(`Removing value listener for ${counselorUid}`);
      weeklyRangesRef.off('value', valueListener);
    });
  });

  console.log(`Set up ${slotListeners.size} listeners for slot monitoring`);
}

// Function to set up real-time appointment monitoring
function setupRealtimeAppointmentMonitoring(studentUid) {
  if (!studentUid) return;

  // Clear existing listeners
  appointmentListeners.forEach(unsubscribe => unsubscribe());
  appointmentListeners.clear();

  // Listen for changes in student's appointments
  const appointmentsRef = window.db.ref(`appointments_by_student/${studentUid}`);
  const listener = appointmentsRef.on('child_changed', (snapshot) => {
    const appointment = snapshot.val();
    if (appointment) {
      // Check for session started
      if (appointment.session_started === true || 
          (appointment.status && appointment.status.toLowerCase() === 'ongoing')) {
        showSessionStartNotification(appointment);
      }
    }
  });
  appointmentListeners.add(() => appointmentsRef.off('child_changed', listener));
}

// Function to set up real-time resource monitoring
function setupRealtimeResourceMonitoring() {
  // Clear existing listeners
  resourceListeners.forEach(unsubscribe => unsubscribe());
  resourceListeners.clear();

  // Listen for new resources being added
  const resourcesRef = window.db.ref('resources');
  const listener = resourcesRef.on('child_added', (snapshot) => {
    const now = Date.now();
    const timeSinceSetup = now - realtimeSetupTime;
    
    // Ignore initial load and calls within first 10 seconds after setup
    if (timeSinceSetup < 10000) {
      console.log(`Ignoring resource addition (too soon after setup: ${timeSinceSetup}ms)`);
      return;
    }
    
    const resource = snapshot.val();
    if (resource) {
      console.log('📚 New resource detected:', resource.title || 'Untitled');
      const message = `New resource available: ${resource.title || 'Check out the latest addition to our resources!'}`;
      showResourceNotification(message);
    }
  });
  resourceListeners.add(() => resourcesRef.off('child_added', listener));
}

// Function to set up real-time message monitoring
// Global flag to prevent duplicate notifications for the same consultation within a short time
window._lastMessageNotificationTime = window._lastMessageNotificationTime || {};

function setupRealtimeMessageMonitoring(studentUid) {
  if (!studentUid) {
    console.log('setupRealtimeMessageMonitoring: No student UID provided');
    return;
  }

  console.log('Setting up real-time message monitoring for student:', studentUid);

  // Clear existing listeners
  messageListeners.forEach(unsubscribe => unsubscribe());
  messageListeners.clear();

  // Listen for changes to all consultations (we'll filter for this student's consultations)
  const consultationsRef = window.db.ref('consultations');
  console.log('Listening to consultations path for message changes');

  const listener = consultationsRef.on('child_changed', (snapshot) => {
    const now = Date.now();
    const timeSinceSetup = now - realtimeSetupTime;

    console.log(`Consultation child_changed detected, time since setup: ${timeSinceSetup}ms`);

    // Ignore initial load and calls within first 5 seconds after setup
    if (timeSinceSetup < 5000) {
      console.log(`Ignoring consultation change (too soon after setup: ${timeSinceSetup}ms)`);
      return;
    }

    const consultation = snapshot.val();
    const consultationId = snapshot.key;

    console.log('Consultation data:', consultation);

    if (consultation) {
      // Check if this consultation belongs to the current student
      const studentFields = ['studentId','student_id','student_uid','studentUid','student'];
      let belongsToStudent = false;

      for (let field of studentFields) {
        if (consultation[field] && String(consultation[field]) === String(studentUid)) {
          belongsToStudent = true;
          break;
        }
      }

      // Also check if student is an object with uid
      if (!belongsToStudent && consultation.student && typeof consultation.student === 'object') {
        if (consultation.student.uid && String(consultation.student.uid) === String(studentUid)) {
          belongsToStudent = true;
        }
      }

      console.log('Consultation belongs to student:', belongsToStudent);

      if (belongsToStudent && consultation.messages && Array.isArray(consultation.messages)) {
        // Get last known message count from Firebase
        const messageCountRef = window.db.ref(`students/${studentUid}/messageCounts/${consultationId}`);

        messageCountRef.once('value').then(countSnapshot => {
          const lastKnownCount = countSnapshot.val() || 0;
          const messageCount = consultation.messages.length;

          console.log(`Message count: ${messageCount}, last known: ${lastKnownCount}`);

          if (messageCount > lastKnownCount) {
            // New message(s) detected - only notify for the LATEST message
            const newMessages = consultation.messages.slice(lastKnownCount);
            console.log('New messages detected:', newMessages.length, 'messages');

            // Only notify for the most recent message (last in array)
            const latestMessage = newMessages[newMessages.length - 1];
            if (latestMessage && latestMessage.senderId !== studentUid) { // Only notify for messages from others (counselors)
              // Check for duplicate notifications within 10 seconds for this consultation
              const lastNotificationTime = window._lastMessageNotificationTime[consultationId] || 0;
              const now = Date.now();
              if (now - lastNotificationTime > 10000) { // 10 seconds cooldown
                console.log('💬 Notifying only for latest message from:', latestMessage.senderName || 'Unknown');
                const senderName = latestMessage.senderName || 'A counselor';
                const messageText = `New message from ${senderName}: ${latestMessage.text ? latestMessage.text.substring(0, 50) + '...' : 'Check your messages!'}`;
                console.log('About to call showMessageNotification with latest message:', messageText);
                showMessageNotification(messageText);
                window._lastMessageNotificationTime[consultationId] = now;
              } else {
                console.log('Skipping duplicate notification for consultation', consultationId, 'within cooldown period');
              }
            }

            // Update last known count in Firebase
            messageCountRef.set(messageCount).catch(err => {
              console.warn('Failed to update message count:', err);
            });
          }
        }).catch(err => {
          console.warn('Failed to get message count:', err);
        });
      }
    }
  });

  // Also set up individual listeners for each consultation's messages path for more reliable detection
  // Use a more robust query to find student's consultations
  const studentConsultationsRef = window.db.ref('consultations');
  const consultationsListener = studentConsultationsRef.on('value', (snapshot) => {
    const allConsultations = snapshot.val();
    if (allConsultations) {
      // Filter consultations that belong to this student
      const studentConsultations = {};
      Object.keys(allConsultations).forEach(consultationId => {
        const consultation = allConsultations[consultationId];

        // Check if this consultation belongs to the current student
        const studentFields = ['studentId','student_id','student_uid','studentUid','student'];
        let belongsToStudent = false;

        for (let field of studentFields) {
          if (consultation[field] && String(consultation[field]) === String(studentUid)) {
            belongsToStudent = true;
            break;
          }
        }

        // Also check if student is an object with uid
        if (!belongsToStudent && consultation.student && typeof consultation.student === 'object') {
          if (consultation.student.uid && String(consultation.student.uid) === String(studentUid)) {
            belongsToStudent = true;
          }
        }

        if (belongsToStudent) {
          studentConsultations[consultationId] = consultation;
        }
      });

      // Now set up listeners for each of the student's consultations
      Object.keys(studentConsultations).forEach(consultationId => {
        const consultation = studentConsultations[consultationId];
        if (consultation.messages && Array.isArray(consultation.messages)) {
          const messagesRef = window.db.ref(`consultations/${consultationId}/messages`);
          const initialMessageCount = consultation.messages.length;

          console.log(`Setting up listener for consultation ${consultationId} with ${initialMessageCount} existing messages`);

          // Listen for new messages being added to this consultation
          const messagesListener = messagesRef.on('child_added', (messageSnapshot) => {
            const now = Date.now();
            const timeSinceSetup = now - realtimeSetupTime;
            const messageIndex = parseInt(messageSnapshot.key);

            // Only process messages that are truly new (index >= initial count AND not during initial setup)
            if (messageIndex < initialMessageCount || timeSinceSetup < 5000) {
              console.log(`Ignoring existing message at index ${messageIndex} (initial count: ${initialMessageCount}, time since setup: ${timeSinceSetup}ms)`);
              return;
            }

            const messageData = messageSnapshot.val();

            console.log(`🔔 New message detected in consultation ${consultationId} at index ${messageIndex}:`, messageData);

            // Only notify if this message is from someone else (counselor)
            if (messageData && messageData.senderId !== studentUid) {
              // Check for duplicate notifications within 10 seconds for this consultation
              const lastNotificationTime = window._lastMessageNotificationTime[consultationId] || 0;
              const now = Date.now();
              if (now - lastNotificationTime > 10000) { // 10 seconds cooldown
                console.log('📢 Triggering real-time message notification');
                const senderName = messageData.senderName || 'A counselor';
                const messageText = `New message from ${senderName}: ${messageData.text ? messageData.text.substring(0, 50) + '...' : 'Check your messages!'}`;
                showMessageNotification(messageText);
                window._lastMessageNotificationTime[consultationId] = now;

                // Update message count (use messageIndex + 1 since indices are 0-based)
                const messageCountRef = window.db.ref(`students/${studentUid}/messageCounts/${consultationId}`);
                messageCountRef.set(messageIndex + 1).catch(err => {
                  console.warn('Failed to update message count:', err);
                });
              } else {
                console.log('Skipping duplicate notification for consultation', consultationId, 'within cooldown period');
              }
            }
          });

          messageListeners.add(() => {
            console.log(`Removing messages listener for consultation ${consultationId}`);
            messagesRef.off('child_added', messagesListener);
          });
        }
      });
    }
  });

  messageListeners.add(() => {
    console.log('Removing consultation listener');
    consultationsRef.off('child_changed', listener);
    studentConsultationsRef.off('value', consultationsListener);
  });

  // Set up periodic fallback check (every 5 minutes) in case real-time listeners miss something
  const fallbackInterval = setInterval(() => {
    console.log('Running periodic message check fallback...');
    // Query all consultations and check for new messages
    window.db.ref('consultations').once('value').then(snapshot => {
      const allConsultations = snapshot.val();
      if (allConsultations) {
        Object.keys(allConsultations).forEach(consultationId => {
          const consultation = allConsultations[consultationId];

          // Check if this consultation belongs to the current student
          const studentFields = ['studentId','student_id','student_uid','studentUid','student'];
          let belongsToStudent = false;

          for (let field of studentFields) {
            if (consultation[field] && String(consultation[field]) === String(studentUid)) {
              belongsToStudent = true;
              break;
            }
          }

          // Also check if student is an object with uid
          if (!belongsToStudent && consultation.student && typeof consultation.student === 'object') {
            if (consultation.student.uid && String(consultation.student.uid) === String(studentUid)) {
              belongsToStudent = true;
            }
          }

          if (belongsToStudent && consultation.messages && Array.isArray(consultation.messages)) {
            // Check message count
            const messageCountRef = window.db.ref(`students/${studentUid}/messageCounts/${consultationId}`);
            messageCountRef.once('value').then(countSnapshot => {
              const lastKnownCount = countSnapshot.val() || 0;
              const currentCount = consultation.messages.length;

              if (currentCount > lastKnownCount) {
                console.log(`Fallback check found ${currentCount - lastKnownCount} missed messages in consultation ${consultationId}`);
                // Get the latest message
                const latestMessage = consultation.messages[consultation.messages.length - 1];
                if (latestMessage && latestMessage.senderId !== studentUid) {
                  // Check for duplicate notifications within 10 seconds for this consultation
                  const lastNotificationTime = window._lastMessageNotificationTime[consultationId] || 0;
                  const now = Date.now();
                  if (now - lastNotificationTime > 10000) { // 10 seconds cooldown
                    const senderName = latestMessage.senderName || 'A counselor';
                    const messageText = `New message from ${senderName}: ${latestMessage.text ? latestMessage.text.substring(0, 50) + '...' : 'Check your messages!'}`;
                    showMessageNotification(messageText);
                    window._lastMessageNotificationTime[consultationId] = now;
                  } else {
                    console.log('Skipping duplicate notification for consultation', consultationId, 'within cooldown period (fallback)');
                  }
                }

                // Update count
                messageCountRef.set(currentCount).catch(err => console.warn('Failed to update message count in fallback:', err));
              }
            });
          }
        });
      }
    }).catch(err => console.warn('Fallback message check failed:', err));
  }, 5 * 60 * 1000); // Every 5 minutes

  messageListeners.add(() => {
    console.log('Clearing fallback message check interval');
    clearInterval(fallbackInterval);
    // Clean up duplicate prevention flags
    window._lastMessageNotificationTime = {};
  });

  console.log('Enhanced message monitoring setup complete');
}

// Function to initialize real-time notifications
function initializeRealtimeNotifications(studentUid, counselorUids) {
  realtimeSetupTime = Date.now();
  console.log('Real-time setup timestamp:', realtimeSetupTime);
  console.log('Initializing real-time notifications for student:', studentUid, 'counselors:', counselorUids);
  
  if (studentUid) {
    console.log('Setting up appointment monitoring...');
    setupRealtimeAppointmentMonitoring(studentUid);
    console.log('Setting up message monitoring...');
    setupRealtimeMessageMonitoring(studentUid);
  } else {
    console.log('No student UID provided, skipping appointment and message monitoring');
  }
  
  if (counselorUids && counselorUids.length > 0) {
    console.log('Setting up slot monitoring for counselors...');
    setupRealtimeSlotMonitoring(counselorUids);
  } else {
    console.log('No counselor UIDs provided, skipping slot monitoring');
  }
  
  // Always monitor for new resources
  console.log('Setting up resource monitoring...');
  setupRealtimeResourceMonitoring();
  
  console.log('Real-time notification setup complete');
}

// Function to clear notifications by type when student has seen them
function clearNotificationsByType(keyword) {
  console.log('clearNotificationsByType called with keyword:', keyword);
  
  if (!window.inAppNotifications || window.inAppNotifications.length === 0) {
    console.log('No notifications to clear');
    return;
  }
  
  const initialCount = window.inAppNotifications.length;
  window.inAppNotifications = window.inAppNotifications.filter(notif => 
    !notif.message.toLowerCase().includes(keyword.toLowerCase())
  );
  
  const removedCount = initialCount - window.inAppNotifications.length;
  console.log(`Cleared ${removedCount} notifications containing "${keyword}"`);
  
  // Update database if user is logged in
  const currentUser = firebase.auth().currentUser;
  if (currentUser && removedCount > 0) {
    const updatedSettings = { ...window.notificationSettings, inAppNotifications: window.inAppNotifications };
    window.db.ref('student_notif').child(currentUser.uid).set(updatedSettings);
  }
  
  // Update UI
  updateBadgeVisibility();
}

// Function to clear notifications by consultation ID (for call notifications)
function clearNotificationsByConsultId(consultId) {
  console.log('clearNotificationsByConsultId called with consultId:', consultId);
  
  if (!window.inAppNotifications || window.inAppNotifications.length === 0) {
    console.log('No notifications to clear');
    return;
  }
  
  const initialCount = window.inAppNotifications.length;
  window.inAppNotifications = window.inAppNotifications.filter(notif => 
    notif.consultId !== consultId
  );
  
  const removedCount = initialCount - window.inAppNotifications.length;
  console.log(`Cleared ${removedCount} notifications for consultation "${consultId}"`);
  
  // Update database if user is logged in
  const currentUser = firebase.auth().currentUser;
  if (currentUser && removedCount > 0) {
    const updatedSettings = { ...window.notificationSettings, inAppNotifications: window.inAppNotifications };
    window.db.ref('student_notif').child(currentUser.uid).set(updatedSettings);
  }
  
  // Update UI
  updateBadgeVisibility();
}

// Clear notifications based on current page
document.addEventListener('DOMContentLoaded', function() {
  const currentPage = window.location.pathname.split('/').pop().toLowerCase();
  console.log('Current page for notification clearing:', currentPage);
  
  // Clear resource notifications when on resources page
  if (currentPage === 'resources.html') {
    clearNotificationsByType('resource');
  }
  
  // Clear mood notifications when on assessments page
  if (currentPage === 'assessments.html') {
    clearNotificationsByType('mood');
  }
  
  // Clear slot notifications when on index page (assuming calendar is there)
  if (currentPage === 'index.html' || currentPage === '') {
    clearNotificationsByType('slot');
  }
});

// Function to cleanup real-time listeners
function cleanupRealtimeNotifications() {
  slotListeners.forEach(unsubscribe => unsubscribe());
  appointmentListeners.forEach(unsubscribe => unsubscribe());
  resourceListeners.forEach(unsubscribe => unsubscribe());
  messageListeners.forEach(unsubscribe => unsubscribe());
  slotListeners.clear();
  appointmentListeners.clear();
  resourceListeners.clear();
  messageListeners.clear();
}

// Test function to manually trigger slot refresh (for debugging)
function testSlotRefresh() {
  console.log('Manually triggering slot refresh...');
  if (window.loadAllAvailabilities) {
    window.loadAllAvailabilities();
  } else {
    console.error('loadAllAvailabilities not available');
  }
}

function testNotification() {
  console.log('Testing notification system manually');
  showSlotsNotification('Test notification: New slots available for testing');
}

function testMessageNotification() {
  console.log('Testing message notification manually');
  showMessageNotification('Test message from counselor: Hello! This is a test message.');
}

// Export functions for use in other scripts
window.NotificationUtils = {
  isNotificationAllowed,
  requestNotificationPermission,
  showNotification,
  showInAppNotification,
  showAppointmentNotification,
  showMessageNotification,
  showCallNotification,
  showSlotsNotification,
  showResultNotification,
  showResourceNotification,
  showMoodReminderNotification,
  updateBadgeVisibility,
  setupAppointmentReminders,
  showSessionStartNotification,
  initializeRealtimeNotifications,
  cleanupRealtimeNotifications,
  testSlotRefresh,
  testNotification,
  testMessageNotification,
  scheduleMoodReminders,
  clearMoodReminder,
  clearOldMoodNotifications,
  displayStoredNotifications,
  clearNotificationsByType,
  clearNotificationsByConsultId
};