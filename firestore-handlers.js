/**
 * FIRESTORE HANDLERS - Assessment Dashboard
 * Handles all backend logic for:
 * - Clear Notifications
 * - Emotional Check-in Real-time
 * - Submit/Unsubmit Daily Reports
 * - Shoutout Data Persistence
 * - Role-Based Access Control
 * - Activity Logger System
 */

// ============================================================================
// GLOBAL STATE
// ============================================================================
let currentTeacher = null;
let currentRole = null;
let allNotifications = [];
let allShoutouts = [];
let allTeacherEmotions = [];
let isSubmittedAssessment = false;
let isSubmittedAttendance = false;

// ============================================================================
// 1. CLEAR NOTIFICATIONS (FIXED)
// ============================================================================

async function handleClearNotifications(event) {
  event.stopPropagation();
  
  if (!currentTeacher) {
    showToastNotification('⚠️ Please log in first', 'warning');
    return;
  }

  try {
    // Option 1: Clear all notifications for current teacher
    const notifRef = db.collection('notifications');
    const snapshot = await notifRef
      .where('recipientTeacher', '==', currentTeacher)
      .get();

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    allNotifications = [];
    renderNotificationsList();
    showToastNotification('✅ Notifications cleared', 'success');
  } catch (error) {
    console.error('Error clearing notifications:', error);
    showToastNotification('❌ Failed to clear notifications', 'error');
  }
}

function clearNotifications(event) {
  handleClearNotifications(event);
}

// ============================================================================
// 2. EMOTIONAL CHECK-IN REAL-TIME (FIXED)
// ============================================================================

async function submitTeacherEmotion(emotionLabel) {
  if (!currentTeacher) {
    showToastNotification('⚠️ Please log in first', 'warning');
    return;
  }

  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD

    // Save to teacher_wellbeing collection
    const wellbeingRef = db.collection('teacher_wellbeing').doc();
    await wellbeingRef.set({
      teacherName: currentTeacher,
      emotion: emotionLabel,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      date: today,
      timeOfDay: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    });

    // Create activity log notification
    await logActivity(
      `${currentTeacher} checked in: ${emotionLabel}`,
      'EMOTION_CHECKIN',
      currentTeacher
    );

    // Close modal and show success
    closeModal('emotionCheckinModal');
    showToastNotification(`😊 Emotion logged: ${emotionLabel}`, 'success');

    // Refresh display in real-time
    await loadTeacherEmotions();
  } catch (error) {
    console.error('Error submitting emotion:', error);
    showToastNotification('❌ Failed to log emotion', 'error');
  }
}

async function loadTeacherEmotions() {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const snapshot = await db.collection('teacher_wellbeing')
      .where('date', '==', today)
      .orderBy('timestamp', 'desc')
      .limit(20)
      .get();

    allTeacherEmotions = [];
    snapshot.forEach(doc => {
      allTeacherEmotions.push({
        id: doc.id,
        ...doc.data()
      });
    });

    renderTeacherEmotionRecap();
  } catch (error) {
    console.error('Error loading teacher emotions:', error);
  }
}

function renderTeacherEmotionRecap() {
  const container = document.getElementById('teacherEmotionRecapGrid');
  if (!container) return;

  container.innerHTML = '';

  if (allTeacherEmotions.length === 0) {
    container.innerHTML = '<p class="text-xs text-slate-400 col-span-4">No check-ins yet today</p>';
    return;
  }

  allTeacherEmotions.forEach(emotion => {
    const emotionCard = document.createElement('div');
    emotionCard.className = 'bg-gradient-to-br from-purple-50 to-pink-50 p-3 rounded-2xl border border-purple-200 text-center';
    
    const emotionEmoji = emotion.emotion.split(' ')[0];
    const emotionText = emotion.emotion.split(' ').slice(1).join(' ');
    
    emotionCard.innerHTML = `
      <div class="text-lg mb-1">${emotionEmoji}</div>
      <p class="text-[11px] font-bold text-purple-700">${emotion.teacherName}</p>
      <p class="text-[9px] text-purple-600">${emotion.timeOfDay}</p>
    `;
    
    container.appendChild(emotionCard);
  });
}

// ============================================================================
// 3. SUBMIT / UNSUBMIT DAILY REPORTS (FIXED)
// ============================================================================

async function submitClassReportAction(reportType) {
  if (!currentTeacher) {
    showToastNotification('⚠️ Please log in first', 'warning');
    return;
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const submissionKey = `${today}_${reportType}`;
    const submissionRef = db.collection('daily_submissions').doc(submissionKey);

    const submissionData = {
      type: reportType, // 'Assessment' or 'Attendance'
      teacher: currentTeacher,
      date: today,
      submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
      status: 'submitted'
    };

    await submissionRef.set(submissionData);

    // Update UI state
    if (reportType === 'Assessment') {
      isSubmittedAssessment = true;
      updateAssessmentSubmitButtons();
    } else if (reportType === 'Attendance') {
      isSubmittedAttendance = true;
      updateAttendanceSubmitButtons();
    }

    // Create activity log
    await logActivity(
      `${currentTeacher} submitted ${reportType} Report for ${today}`,
      'REPORT_SUBMITTED',
      currentTeacher
    );

    showToastNotification(`✅ ${reportType} Report Submitted!`, 'success');

    // Refresh submission status board
    await loadSubmissionStatuses();
  } catch (error) {
    console.error('Error submitting report:', error);
    showToastNotification(`❌ Failed to submit ${reportType}`, 'error');
  }
}

async function unsubmitClassReportAction(reportType) {
  if (!currentTeacher) {
    showToastNotification('⚠️ Please log in first', 'warning');
    return;
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const submissionKey = `${today}_${reportType}`;
    const submissionRef = db.collection('daily_submissions').doc(submissionKey);

    await submissionRef.delete();

    // Update UI state
    if (reportType === 'Assessment') {
      isSubmittedAssessment = false;
      updateAssessmentSubmitButtons();
    } else if (reportType === 'Attendance') {
      isSubmittedAttendance = false;
      updateAttendanceSubmitButtons();
    }

    // Create activity log
    await logActivity(
      `${currentTeacher} unsubmitted ${reportType} Report for ${today}`,
      'REPORT_UNSUBMITTED',
      currentTeacher
    );

    showToastNotification(`↩️ ${reportType} Report Unsubmitted`, 'success');

    // Refresh submission status board
    await loadSubmissionStatuses();
  } catch (error) {
    console.error('Error unsubmitting report:', error);
    showToastNotification(`❌ Failed to unsubmit ${reportType}`, 'error');
  }
}

function updateAssessmentSubmitButtons() {
  const container = document.getElementById('assessmentActionButtonsContainer');
  if (!container) return;

  const submitBtn = container.querySelector('[onclick*="submitClassReportAction"]');
  const unsubmitBtn = container.querySelector('[onclick*="unsubmitClassReportAction"]');

  if (isSubmittedAssessment) {
    if (submitBtn) submitBtn.style.opacity = '0.5';
    if (submitBtn) submitBtn.disabled = true;
    if (unsubmitBtn) unsubmitBtn.style.opacity = '1';
    if (unsubmitBtn) unsubmitBtn.disabled = false;
  } else {
    if (submitBtn) submitBtn.style.opacity = '1';
    if (submitBtn) submitBtn.disabled = false;
    if (unsubmitBtn) unsubmitBtn.style.opacity = '0.5';
    if (unsubmitBtn) unsubmitBtn.disabled = true;
  }
}

function updateAttendanceSubmitButtons() {
  const container = document.getElementById('attendanceActionButtonsContainer');
  if (!container) return;

  const submitBtn = container.querySelector('[onclick*="submitClassReportAction"]');
  const unsubmitBtn = container.querySelector('[onclick*="unsubmitClassReportAction"]');

  if (isSubmittedAttendance) {
    if (submitBtn) submitBtn.style.opacity = '0.5';
    if (submitBtn) submitBtn.disabled = true;
    if (unsubmitBtn) unsubmitBtn.style.opacity = '1';
    if (unsubmitBtn) unsubmitBtn.disabled = false;
  } else {
    if (submitBtn) submitBtn.style.opacity = '1';
    if (submitBtn) submitBtn.disabled = false;
    if (unsubmitBtn) unsubmitBtn.style.opacity = '0.5';
    if (unsubmitBtn) unsubmitBtn.disabled = true;
  }
}

async function loadSubmissionStatuses() {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const snapshot = await db.collection('daily_submissions')
      .where('date', '==', today)
      .get();

    const submissions = {};
    snapshot.forEach(doc => {
      const data = doc.data();
      submissions[data.type] = data;
    });

    isSubmittedAssessment = !!submissions['Assessment'];
    isSubmittedAttendance = !!submissions['Attendance'];

    updateAssessmentSubmitButtons();
    updateAttendanceSubmitButtons();
    renderSubmissionStatusBoard(submissions);
  } catch (error) {
    console.error('Error loading submission statuses:', error);
  }
}

function renderSubmissionStatusBoard(submissions) {
  const container = document.getElementById('submissionStatusGrid');
  if (!container) return;

  container.innerHTML = '';

  const statuses = [
    {
      title: 'Assessment Submission',
      key: 'Assessment',
      icon: 'fa-clipboard-check',
      color: 'blue'
    },
    {
      title: 'Attendance Submission',
      key: 'Attendance',
      icon: 'fa-calendar-check',
      color: 'emerald'
    },
    {
      title: 'Shoutout Logs',
      key: 'Shoutouts',
      icon: 'fa-award',
      color: 'amber'
    }
  ];

  statuses.forEach(status => {
    const submitted = submissions[status.key];
    const statusCard = document.createElement('div');
    statusCard.className = `bg-white p-4 rounded-2xl border border-slate-200 shadow-sm`;
    
    const colorClasses = {
      blue: 'bg-blue-50 text-blue-600 border-blue-200',
      emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      amber: 'bg-amber-50 text-amber-600 border-amber-200'
    };

    statusCard.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs font-bold text-slate-600">${status.title}</p>
        <i class="fa-solid ${status.icon} text-sm text-slate-400"></i>
      </div>
      <div class="flex items-baseline gap-2">
        <div class="px-3 py-1 rounded-full text-xs font-bold ${colorClasses[status.color]}">
          ${submitted ? '✅ Submitted' : '⏳ Pending'}
        </div>
      </div>
      ${submitted ? `<p class="text-[10px] text-slate-400 mt-2">by ${submitted.teacher}</p>` : ''}
    `;

    container.appendChild(statusCard);
  });
}

// ============================================================================
// 4. SHOUTOUT DATA PERSISTENT (FIXED)
// ============================================================================

async function saveShoutout(event) {
  event.preventDefault();

  if (!currentTeacher) {
    showToastNotification('⚠️ Please log in first', 'warning');
    return;
  }

  try {
    const studentSelect = document.getElementById('inp_shoutout_student');
    const categorySelect = document.getElementById('inp_shoutout_category');
    const fileInput = document.getElementById('inp_shoutout_file');

    const studentName = studentSelect.value;
    const category = categorySelect.value;
    const file = fileInput.files[0];

    if (!studentName || !category || !file) {
      showToastNotification('⚠️ Fill all fields and attach screenshot', 'warning');
      return;
    }

    // Upload image to Firebase Storage
    const storageRef = firebase.storage().ref();
    const timestamp = new Date().getTime();
    const imageRef = storageRef.child(`shoutouts/${timestamp}_${file.name}`);
    
    const uploadTask = await imageRef.put(file);
    const imageUrl = await uploadTask.ref.getDownloadURL();

    // Save shoutout to Firestore
    const shoutoutRef = db.collection('shoutouts').doc();
    await shoutoutRef.set({
      studentName: studentName,
      category: category,
      teacherName: currentTeacher,
      imageUrl: imageUrl,
      date: new Date().toISOString().split('T')[0],
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Create activity log
    await logActivity(
      `${currentTeacher} gave shoutout to ${studentName}: ${category}`,
      'SHOUTOUT_CREATED',
      currentTeacher
    );

    showToastNotification(`⭐ Shoutout saved for ${studentName}!`, 'success');
    
    // Reset form and close modal
    document.getElementById('shoutoutForm').reset();
    document.getElementById('shoutoutPhotoPreviewBox').classList.add('hidden');
    closeNewShoutoutModal();

    // Refresh shoutout list
    await loadShoutouts();
  } catch (error) {
    console.error('Error saving shoutout:', error);
    showToastNotification('❌ Failed to save shoutout', 'error');
  }
}

async function loadShoutouts() {
  try {
    let query = db.collection('shoutouts');

    // Apply role-based filtering
    if (currentRole && currentRole !== 'Director' && currentRole !== 'Principal') {
      // Regular teachers only see their own shoutouts and those for their students
      query = query.where('teacherName', '==', currentTeacher);
    }

    const snapshot = await query
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();

    allShoutouts = [];
    snapshot.forEach(doc => {
      allShoutouts.push({
        id: doc.id,
        ...doc.data()
      });
    });

    renderShoutoutTable();
    renderShoutoutSummary();
  } catch (error) {
    console.error('Error loading shoutouts:', error);
  }
}

function renderShoutoutTable() {
  const tbody = document.getElementById('shoutoutTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (allShoutouts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="py-4 text-center text-xs text-slate-400">No shoutouts yet</td></tr>';
    return;
  }

  allShoutouts.forEach(shoutout => {
    const row = document.createElement('tr');
    const dateObj = shoutout.timestamp?.toDate() || new Date(shoutout.date);
    const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    row.innerHTML = `
      <td class="py-3 px-3">${dateStr}</td>
      <td class="py-3 px-3 font-bold">${shoutout.studentName}</td>
      <td class="py-3 px-3">${shoutout.category}</td>
      <td class="py-3 px-3">${shoutout.teacherName}</td>
      <td class="py-3 px-3 text-center">
        <button onclick="viewShoutoutImage('${shoutout.imageUrl}')" class="text-brand-600 hover:underline text-xs font-bold">
          <i class="fa-solid fa-image mr-1"></i>View
        </button>
      </td>
      <td class="py-3 px-3 text-right">
        <button onclick="deleteShoutout('${shoutout.id}')" class="text-rose-500 hover:underline text-xs font-bold">
          <i class="fa-solid fa-trash mr-1"></i>Delete
        </button>
      </td>
    `;

    tbody.appendChild(row);
  });

  // Update badge
  const badge = document.getElementById('shoutoutLogCountBadge');
  if (badge) badge.textContent = `${allShoutouts.length} Recorded`;
}

function renderShoutoutSummary() {
  const container = document.getElementById('shoutoutSummaryList');
  if (!container) return;

  container.innerHTML = '';

  // Group shoutouts by student
  const summaryMap = {};
  allShoutouts.forEach(shoutout => {
    if (!summaryMap[shoutout.studentName]) {
      summaryMap[shoutout.studentName] = 0;
    }
    summaryMap[shoutout.studentName]++;
  });

  // Sort by count (descending)
  const sorted = Object.entries(summaryMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  if (sorted.length === 0) {
    container.innerHTML = '<p class="text-xs text-slate-400">No shoutouts yet</p>';
    return;
  }

  sorted.forEach(([name, count]) => {
    const item = document.createElement('div');
    item.className = 'flex items-center justify-between p-2.5 bg-amber-50 rounded-xl border border-amber-200';
    item.innerHTML = `
      <span class="text-xs font-bold text-amber-900">${name}</span>
      <span class="text-xs font-black text-amber-600 bg-amber-200 px-2 py-0.5 rounded-full">${count}</span>
    `;
    container.appendChild(item);
  });
}

async function deleteShoutout(shoutoutId) {
  if (!confirm('Delete this shoutout?')) return;

  try {
    await db.collection('shoutouts').doc(shoutoutId).delete();
    showToastNotification('🗑️ Shoutout deleted', 'success');
    await loadShoutouts();
  } catch (error) {
    console.error('Error deleting shoutout:', error);
    showToastNotification('❌ Failed to delete shoutout', 'error');
  }
}

// ============================================================================
// 5. ACTIVITY LOGGER & NOTIFICATION SYSTEM (FIXED)
// ============================================================================

async function logActivity(message, type, triggerTeacher) {
  try {
    const notificationRef = db.collection('notifications').doc();
    
    // Determine recipient(s) based on message type
    let recipients = [];
    if (type === 'REPORT_SUBMITTED' || type === 'EMOTION_CHECKIN') {
      // Notify Director and Principal
      recipients = ['Ms. Mahrukh (Director)', 'Ms. Latifah (Principal)'];
    } else if (type === 'SHOUTOUT_CREATED') {
      // Notify Director and Principal
      recipients = ['Ms. Mahrukh (Director)', 'Ms. Latifah (Principal)'];
    } else {
      recipients = [triggerTeacher];
    }

    for (const recipient of recipients) {
      const notifRef = db.collection('notifications').doc();
      await notifRef.set({
        message: message,
        type: type,
        triggerTeacher: triggerTeacher,
        recipientTeacher: recipient,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        read: false,
        date: new Date().toISOString().split('T')[0]
      });
    }

    // Update notifications display if currently viewing
    if (currentTeacher) {
      loadNotifications();
    }
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

async function loadNotifications() {
  try {
    if (!currentTeacher) return;

    const snapshot = await db.collection('notifications')
      .where('recipientTeacher', '==', currentTeacher)
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();

    allNotifications = [];
    let unreadCount = 0;

    snapshot.forEach(doc => {
      const notif = doc.data();
      allNotifications.push({
        id: doc.id,
        ...notif
      });
      if (!notif.read) unreadCount++;
    });

    renderNotificationsList();
    updateNotificationBadge(unreadCount);
  } catch (error) {
    console.error('Error loading notifications:', error);
  }
}

function renderNotificationsList() {
  const notifList = document.getElementById('notifList');
  if (!notifList) return;

  notifList.innerHTML = '';

  if (allNotifications.length === 0) {
    notifList.innerHTML = '<p class="text-xs text-slate-400 py-4">No new notifications</p>';
    return;
  }

  allNotifications.forEach(notif => {
    const notifItem = document.createElement('div');
    notifItem.className = `p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition ${!notif.read ? 'border-brand-300 bg-brand-50' : ''}`;

    const timeAgo = getTimeAgo(notif.timestamp?.toDate());
    let icon = '📢';
    
    if (notif.type === 'EMOTION_CHECKIN') icon = '💖';
    if (notif.type === 'REPORT_SUBMITTED') icon = '✅';
    if (notif.type === 'REPORT_UNSUBMITTED') icon = '↩️';
    if (notif.type === 'SHOUTOUT_CREATED') icon = '⭐';

    notifItem.innerHTML = `
      <div class="flex items-start justify-between gap-2">
        <div class="flex items-start gap-2 flex-1">
          <span class="text-lg">${icon}</span>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-bold text-slate-700">${notif.message}</p>
            <p class="text-[10px] text-slate-500 mt-0.5">${timeAgo}</p>
          </div>
        </div>
        <button onclick="markNotificationRead('${notif.id}')" class="text-slate-400 hover:text-slate-600 text-xs">
          <i class="fa-solid fa-check"></i>
        </button>
      </div>
    `;

    notifList.appendChild(notifItem);
  });
}

async function markNotificationRead(notifId) {
  try {
    await db.collection('notifications').doc(notifId).update({
      read: true
    });
    loadNotifications();
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
}

function updateNotificationBadge(count) {
  const badge = document.getElementById('notifBadge');
  if (!badge) return;

  if (count > 0) {
    badge.classList.remove('hidden');
    badge.textContent = count;
  } else {
    badge.classList.add('hidden');
  }
}

function getTimeAgo(date) {
  if (!date) return 'just now';
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// ============================================================================
// 6. ROLE-BASED ACCESS CONTROL FOR SHOUTOUTS
// ============================================================================

function canViewAllShoutouts() {
  return currentRole === 'Director' || currentRole === 'Principal';
}

function getRoleFromTeacherName(teacherName) {
  if (teacherName === 'Ms. Mahrukh (Director)') return 'Director';
  if (teacherName === 'Ms. Latifah (Principal)') return 'Principal';
  return 'Teacher';
}

// ============================================================================
// 7. HELPER FUNCTIONS
// ============================================================================

function showToastNotification(message, type = 'info') {
  const toast = document.getElementById('toastNotification');
  const icon = document.getElementById('toastIcon');
  const text = document.getElementById('toastMessage');

  if (!toast) return;

  const colors = {
    success: { icon: 'fa-circle-check', color: 'emerald', bg: 'bg-emerald-500' },
    error: { icon: 'fa-circle-xmark', color: 'rose', bg: 'bg-rose-500' },
    warning: { icon: 'fa-circle-exclamation', color: 'amber', bg: 'bg-amber-500' },
    info: { icon: 'fa-circle-info', color: 'blue', bg: 'bg-blue-500' }
  };

  const config = colors[type] || colors.info;

  text.textContent = message;
  icon.className = `fa-solid ${config.icon} text-${config.color}-400 text-lg`;
  toast.className = `fixed bottom-5 right-5 ${config.bg} text-white px-5 py-3.5 rounded-2xl shadow-2xl z-[120] flex items-center space-x-3 transition-all transform translate-y-0 opacity-100`;

  setTimeout(() => {
    toast.classList.add('translate-y-20', 'opacity-0');
  }, 3000);
}

function previewShoutoutPhoto(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const preview = document.getElementById('shoutoutPhotoPreviewBox');
    const img = document.getElementById('shoutoutPhotoPreviewImg');
    
    if (preview && img) {
      img.src = e.target.result;
      preview.classList.remove('hidden');
    }
  };
  reader.readAsDataURL(file);
}

function viewShoutoutImage(imageUrl) {
  window.open(imageUrl, '_blank');
}

// ============================================================================
// 8. INITIALIZATION & REAL-TIME LISTENERS
// ============================================================================

function setupRealtimeListeners() {
  if (!currentTeacher) return;

  // Listen to notifications in real-time
  db.collection('notifications')
    .where('recipientTeacher', '==', currentTeacher)
    .orderBy('timestamp', 'desc')
    .limit(50)
    .onSnapshot(snapshot => {
      loadNotifications();
    });

  // Listen to teacher emotions in real-time
  const today = new Date().toISOString().split('T')[0];
  db.collection('teacher_wellbeing')
    .where('date', '==', today)
    .onSnapshot(snapshot => {
      loadTeacherEmotions();
    });

  // Listen to submission statuses in real-time
  db.collection('daily_submissions')
    .where('date', '==', today)
    .onSnapshot(snapshot => {
      const submissions = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        submissions[data.type] = data;
      });
      renderSubmissionStatusBoard(submissions);
    });

  // Listen to shoutouts in real-time
  db.collection('shoutouts')
    .orderBy('timestamp', 'desc')
    .limit(100)
    .onSnapshot(snapshot => {
      loadShoutouts();
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  // Will be triggered after user logs in
  console.log('Firestore handlers loaded');
});

// Export functions for HTML onclick handlers
window.handleClearNotifications = handleClearNotifications;
window.submitTeacherEmotion = submitTeacherEmotion;
window.submitClassReportAction = submitClassReportAction;
window.unsubmitClassReportAction = unsubmitClassReportAction;
window.saveShoutout = saveShoutout;
window.loadShoutouts = loadShoutouts;
window.deleteShoutout = deleteShoutout;
window.loadNotifications = loadNotifications;
window.markNotificationRead = markNotificationRead;
window.setupRealtimeListeners = setupRealtimeListeners;
window.previewShoutoutPhoto = previewShoutoutPhoto;
window.viewShoutoutImage = viewShoutoutImage;
window.showToastNotification = showToastNotification;
