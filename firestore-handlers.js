/**
 * FIRESTORE HANDLERS - Assessment Dashboard
 * Real-time database sync, submissions, notifications, emotions
 * ✅ FIXED: Emotional check-in, Submit/Unsubmit toggle, Shoutout persistent data
 */

// ============================================================================
// GLOBAL VARIABLES & STATE MANAGEMENT
// ============================================================================

let currentTeacher = null;
let currentRole = null;
let isSubmittedAssessment = false;
let isSubmittedAttendance = false;
let allNotifications = [];
let allShoutouts = [];
let allTeacherEmotions = [];
let allStudents = [];
let unlisteners = []; // Store listeners for cleanup

// ============================================================================
// HELPER: Get role from teacher name
// ============================================================================

function getRoleFromTeacherName(name) {
  if (name === 'Ms. Mahrukh (Director)') return 'director';
  if (name === 'Ms. Latifah (Principal)') return 'principal';
  return 'teacher';
}

// ============================================================================
// HELPER: Show toast notifications
// ============================================================================

function showToastNotification(message, type = 'success') {
  const toast = document.getElementById('toastNotification');
  const icon = document.getElementById('toastIcon');
  const msg = document.getElementById('toastMessage');
  
  if (!toast) return;
  
  msg.textContent = message;
  
  if (type === 'success') {
    icon.className = 'fa-solid fa-circle-check text-emerald-400 text-lg';
    toast.className = 'fixed bottom-5 right-5 bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl z-[120] flex items-center space-x-3 transition-all translate-y-0 opacity-100';
  } else if (type === 'error') {
    icon.className = 'fa-solid fa-circle-xmark text-rose-400 text-lg';
    toast.className = 'fixed bottom-5 right-5 bg-rose-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl z-[120] flex items-center space-x-3 transition-all translate-y-0 opacity-100';
  }
  
  setTimeout(() => {
    toast.classList.add('translate-y-20', 'opacity-0');
  }, 3000);
}

// ============================================================================
// 1️⃣ EMOTIONAL CHECK-IN SYSTEM (FIXED - Real-time synced)
// ============================================================================

function submitTeacherEmotion(emotion) {
  if (!currentTeacher) {
    showToastNotification('❌ Not logged in', 'error');
    return;
  }

  const timestamp = new Date().toISOString();
  const today = new Date().toISOString().split('T')[0];

  db.collection('teacher_wellbeing')
    .add({
      teacher: currentTeacher,
      emotion: emotion,
      timestamp: timestamp,
      date: today,
      role: currentRole
    })
    .then(() => {
      showToastNotification(`💖 ${emotion} logged!`, 'success');
      closeEmotionCheckModal();
      
      // Log this action to notifications
      logActivity(`${currentTeacher} checked in: ${emotion}`);
      
      // Reload emotions to update UI everywhere
      loadTeacherEmotions();
    })
    .catch(error => {
      showToastNotification('❌ Error saving emotion', 'error');
      console.error('Error:', error);
    });
}

function loadTeacherEmotions() {
  const today = new Date().toISOString().split('T')[0];

  // Real-time listener
  const unsubscribe = db.collection('teacher_wellbeing')
    .where('date', '==', today)
    .orderBy('timestamp', 'desc')
    .limit(20)
    .onSnapshot((snapshot) => {
      allTeacherEmotions = [];
      const emotionMap = {};

      snapshot.forEach(doc => {
        const data = doc.data();
        allTeacherEmotions.push(data);
        
        if (!emotionMap[data.teacher]) {
          emotionMap[data.teacher] = [];
        }
        emotionMap[data.teacher].push(data.emotion);
      });

      renderTeacherEmotionsUI(emotionMap);
    });

  unlisteners.push(unsubscribe);
}

function renderTeacherEmotionsUI(emotionMap) {
  const grid = document.getElementById('teacherEmotionRecapGrid');
  if (!grid) return;

  grid.innerHTML = '';

  for (const [teacher, emotions] of Object.entries(emotionMap)) {
    const latestEmotion = emotions[emotions.length - 1];
    const card = document.createElement('div');
    card.className = 'bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-2xl border border-purple-200 text-center hover:shadow-md transition';
    card.innerHTML = `
      <div class="text-3xl mb-2">${latestEmotion.split(' ')[0]}</div>
      <p class="text-xs font-bold text-slate-700">${teacher}</p>
      <p class="text-[10px] text-slate-500">${latestEmotion.split(' ').slice(1).join(' ')}</p>
    `;
    grid.appendChild(card);
  }
}

// ============================================================================
// 2️⃣ SUBMISSION STATUS SYSTEM (FIXED - Toggle buttons + Real-time)
// ============================================================================

function submitClassReportAction(reportType) {
  if (!currentTeacher) {
    showToastNotification('❌ Not logged in', 'error');
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  const docKey = `${today}_${reportType}_${currentTeacher}`;

  db.collection('daily_submissions')
    .doc(docKey)
    .set({
      teacher: currentTeacher,
      reportType: reportType,
      status: 'submitted',
      timestamp: new Date().toISOString(),
      date: today,
      submittedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    }, { merge: true })
    .then(() => {
      showToastNotification(`✅ ${reportType} submitted!`, 'success');
      
      // Update button state immediately
      if (reportType === 'Assessment') {
        isSubmittedAssessment = true;
      } else if (reportType === 'Attendance') {
        isSubmittedAttendance = true;
      }
      
      updateSubmitButtons();
      logActivity(`${currentTeacher} submitted ${reportType}`);
      loadSubmissionStatuses();
    })
    .catch(error => {
      showToastNotification('❌ Error submitting', 'error');
      console.error('Error:', error);
    });
}

function unsubmitClassReportAction(reportType) {
  if (!currentTeacher) {
    showToastNotification('❌ Not logged in', 'error');
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  const docKey = `${today}_${reportType}_${currentTeacher}`;

  db.collection('daily_submissions')
    .doc(docKey)
    .delete()
    .then(() => {
      showToastNotification(`↩️ ${reportType} unsubmitted`, 'success');
      
      // Update button state immediately
      if (reportType === 'Assessment') {
        isSubmittedAssessment = false;
      } else if (reportType === 'Attendance') {
        isSubmittedAttendance = false;
      }
      
      updateSubmitButtons();
      logActivity(`${currentTeacher} unsubmitted ${reportType}`);
      loadSubmissionStatuses();
    })
    .catch(error => {
      showToastNotification('❌ Error unsubmitting', 'error');
      console.error('Error:', error);
    });
}

function updateSubmitButtons() {
  // Assessment buttons
  const assessmentSubmit = document.querySelector('button[onclick*="submitClassReportAction(\'Assessment\')"]');
  const assessmentUnsubmit = document.querySelector('button[onclick*="unsubmitClassReportAction(\'Assessment\')"]');
  
  if (assessmentSubmit) {
    if (isSubmittedAssessment) {
      assessmentSubmit.style.display = 'none';
      assessmentSubmit.disabled = true;
    } else {
      assessmentSubmit.style.display = 'flex';
      assessmentSubmit.disabled = false;
    }
  }
  
  if (assessmentUnsubmit) {
    if (isSubmittedAssessment) {
      assessmentUnsubmit.style.display = 'flex';
      assessmentUnsubmit.disabled = false;
    } else {
      assessmentUnsubmit.style.display = 'none';
      assessmentUnsubmit.disabled = true;
    }
  }

  // Attendance buttons
  const attendanceSubmit = document.querySelector('button[onclick*="submitClassReportAction(\'Attendance\')"]');
  const attendanceUnsubmit = document.querySelector('button[onclick*="unsubmitClassReportAction(\'Attendance\')"]');
  
  if (attendanceSubmit) {
    if (isSubmittedAttendance) {
      attendanceSubmit.style.display = 'none';
      attendanceSubmit.disabled = true;
    } else {
      attendanceSubmit.style.display = 'flex';
      attendanceSubmit.disabled = false;
    }
  }
  
  if (attendanceUnsubmit) {
    if (isSubmittedAttendance) {
      attendanceUnsubmit.style.display = 'flex';
      attendanceUnsubmit.disabled = false;
    } else {
      attendanceUnsubmit.style.display = 'none';
      attendanceUnsubmit.disabled = true;
    }
  }

  // Update badge
  const badge = document.getElementById('assessmentSubmitStatusBadge');
  if (badge) {
    badge.textContent = isSubmittedAssessment ? '✅ Submitted' : 'Pending';
    badge.className = isSubmittedAssessment 
      ? 'text-[11px] font-bold bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full'
      : 'text-[11px] font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-full';
  }
}

function loadSubmissionStatuses() {
  const today = new Date().toISOString().split('T')[0];

  // Real-time listener
  const unsubscribe = db.collection('daily_submissions')
    .where('date', '==', today)
    .onSnapshot((snapshot) => {
      const submissions = {};

      snapshot.forEach(doc => {
        const data = doc.data();
        const key = `${data.reportType}_${data.teacher}`;
        submissions[key] = data;
      });

      renderSubmissionStatusBoard(submissions);
      
      // Update current user's button states
      if (currentTeacher) {
        const assessKey = `Assessment_${currentTeacher}`;
        const attKey = `Attendance_${currentTeacher}`;
        
        isSubmittedAssessment = !!submissions[assessKey];
        isSubmittedAttendance = !!submissions[attKey];
        
        updateSubmitButtons();
      }
    });

  unlisteners.push(unsubscribe);
}

function renderSubmissionStatusBoard(submissions) {
  const grid = document.getElementById('submissionStatusGrid');
  if (!grid) return;

  grid.innerHTML = '';

  const teachers = ['Ms. Mahrukh (Director)', 'Ms. Latifah (Principal)', 'Tr Nanda', 'Tr Afi', 'Tr Widya', 'Tr Sindy', 'Tr Yunda', 'Tr Diya'];

  teachers.forEach(teacher => {
    const assessKey = `Assessment_${teacher}`;
    const attKey = `Attendance_${teacher}`;
    
    const assessData = submissions[assessKey];
    const attData = submissions[attKey];
    
    const card = document.createElement('div');
    card.className = 'bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition';
    card.innerHTML = `
      <p class="text-xs font-bold text-slate-600 mb-3">${teacher}</p>
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-semibold text-slate-600">Assessment:</span>
          <span class="text-[10px] font-bold px-2 py-1 rounded-full ${assessData ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">
            ${assessData ? `✅ ${assessData.submittedAt}` : '⏳ Pending'}
          </span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-semibold text-slate-600">Attendance:</span>
          <span class="text-[10px] font-bold px-2 py-1 rounded-full ${attData ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">
            ${attData ? `✅ ${attData.submittedAt}` : '⏳ Pending'}
          </span>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

// ============================================================================
// 3️⃣ SHOUTOUT SYSTEM (FIXED - Persistent data + Role-based access)
// ============================================================================

function saveShoutout(event) {
  event.preventDefault();

  if (!currentTeacher) {
    showToastNotification('❌ Not logged in', 'error');
    return;
  }

  const studentName = document.getElementById('inp_shoutout_student').value;
  const category = document.getElementById('inp_shoutout_category').value;
  const fileInput = document.getElementById('inp_shoutout_file');

  if (!fileInput.files[0]) {
    showToastNotification('❌ Please upload screenshot', 'error');
    return;
  }

  // Read image as base64
  const reader = new FileReader();
  reader.onload = function(e) {
    const timestamp = new Date().toISOString();
    
    db.collection('shoutouts')
      .add({
        studentName: studentName,
        category: category,
        teacher: currentTeacher,
        imagePath: e.target.result,
        timestamp: timestamp,
        date: new Date().toISOString().split('T')[0],
        role: currentRole,
        createdAt: timestamp
      })
      .then((docRef) => {
        showToastNotification(`⭐ Shoutout saved for ${studentName}!`, 'success');
        document.getElementById('shoutoutForm').reset();
        document.getElementById('shoutoutPhotoPreviewBox').classList.add('hidden');
        closeNewShoutoutModal();
        
        logActivity(`${currentTeacher} gave shoutout to ${studentName}: ${category}`);
        loadShoutouts();
      })
      .catch(error => {
        showToastNotification('❌ Error saving shoutout', 'error');
        console.error('Error:', error);
      });
  };
  reader.readAsDataURL(fileInput.files[0]);
}

function loadShoutouts() {
  // Real-time listener
  const unsubscribe = db.collection('shoutouts')
    .orderBy('timestamp', 'desc')
    .limit(100)
    .onSnapshot((snapshot) => {
      allShoutouts = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        
        // Apply role-based filtering
        if (currentRole === 'director' || currentRole === 'principal') {
          // Directors/principals see all
          allShoutouts.push(data);
        } else if (data.teacher === currentTeacher) {
          // Teachers only see their own
          allShoutouts.push(data);
        }
      });

      renderShoutoutsTable();
      renderShoutoutSummary();
    });

  unlisteners.push(unsubscribe);
}

function renderShoutoutsTable() {
  const tbody = document.getElementById('shoutoutTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (allShoutouts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="py-4 text-center text-xs text-slate-400">No shoutouts recorded</td></tr>';
    return;
  }

  allShoutouts.forEach((shoutout, index) => {
    const row = document.createElement('tr');
    row.className = 'hover:bg-slate-50 transition';
    const dateStr = new Date(shoutout.timestamp).toLocaleDateString('id-ID');
    row.innerHTML = `
      <td class="py-3 px-3 text-xs font-semibold">${dateStr}</td>
      <td class="py-3 px-3 text-xs font-semibold">${shoutout.studentName}</td>
      <td class="py-3 px-3"><span class="px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold">${shoutout.category}</span></td>
      <td class="py-3 px-3 text-xs font-semibold">${shoutout.teacher}</td>
      <td class="py-3 px-3 text-center">
        <button onclick="viewShoutoutImage(${index})" class="text-brand-600 hover:underline font-bold text-xs">📸 View</button>
      </td>
      <td class="py-3 px-3 text-right">
        <button onclick="deleteShoutout(${index})" class="text-rose-600 hover:underline font-bold text-xs">🗑️ Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });

  // Update badge
  const badge = document.getElementById('shoutoutLogCountBadge');
  if (badge) {
    badge.textContent = `${allShoutouts.length} Recorded`;
  }
}

function renderShoutoutSummary() {
  const summary = document.getElementById('shoutoutSummaryList');
  if (!summary) return;

  summary.innerHTML = '';

  const studentMap = {};
  allShoutouts.forEach(s => {
    if (!studentMap[s.studentName]) {
      studentMap[s.studentName] = 0;
    }
    studentMap[s.studentName]++;
  });

  Object.entries(studentMap)
    .sort(([, a], [, b]) => b - a)
    .forEach(([student, count]) => {
      const item = document.createElement('div');
      item.className = 'flex items-center justify-between p-2.5 bg-amber-50 rounded-xl border border-amber-200 hover:bg-amber-100 transition';
      item.innerHTML = `
        <span class="text-xs font-semibold text-slate-700">${student}</span>
        <span class="text-xs font-bold bg-amber-200 text-amber-900 px-2.5 py-1 rounded-full">${count}</span>
      `;
      summary.appendChild(item);
    });
}

function deleteShoutout(index) {
  if (!confirm('Delete this shoutout?')) return;
  
  const shoutout = allShoutouts[index];
  db.collection('shoutouts')
    .where('timestamp', '==', shoutout.timestamp)
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => doc.ref.delete());
      showToastNotification('🗑️ Shoutout deleted', 'success');
      loadShoutouts();
    })
    .catch(error => {
      showToastNotification('❌ Error deleting', 'error');
      console.error('Error:', error);
    });
}

function viewShoutoutImage(index) {
  const shoutout = allShoutouts[index];
  if (shoutout.imagePath) {
    const win = window.open();
    win.document.write(`<img src="${shoutout.imagePath}" style="max-width: 100%; max-height: 100%;">`);
  }
}

function previewShoutoutPhoto(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const preview = document.getElementById('shoutoutPhotoPreviewImg');
      const box = document.getElementById('shoutoutPhotoPreviewBox');
      preview.src = e.target.result;
      box.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }
}

// ============================================================================
// 4️⃣ NOTIFICATION SYSTEM (Real-time Activity Log)
// ============================================================================

function logActivity(action) {
  if (!currentTeacher) return;
  
  db.collection('notifications')
    .add({
      teacher: currentTeacher,
      action: action,
      timestamp: new Date().toISOString(),
      role: currentRole,
      read: false
    })
    .then(() => {
      loadNotifications();
    })
    .catch(error => console.error('Error logging:', error));
}

function loadNotifications() {
  if (!currentTeacher) return;

  // Real-time listener
  const unsubscribe = db.collection('notifications')
    .orderBy('timestamp', 'desc')
    .limit(30)
    .onSnapshot((snapshot) => {
      allNotifications = [];

      snapshot.forEach(doc => {
        allNotifications.push({ id: doc.id, ...doc.data() });
      });

      renderNotificationsDropdown();
    });

  unlisteners.push(unsubscribe);
}

function renderNotificationsDropdown() {
  const list = document.getElementById('notifList');
  const badge = document.getElementById('notifBadge');

  if (!list) return;

  list.innerHTML = '';

  if (allNotifications.length === 0) {
    list.innerHTML = '<p class="text-xs text-slate-400 py-2">No activities yet</p>';
    if (badge) badge.classList.add('hidden');
    return;
  }

  allNotifications.forEach(notif => {
    const item = document.createElement('div');
    item.className = 'p-3 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100 transition cursor-pointer';
    const timeStr = new Date(notif.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    item.innerHTML = `
      <p class="text-xs font-bold text-slate-800">${notif.teacher}</p>
      <p class="text-[11px] text-slate-600 mt-1">${notif.action}</p>
      <p class="text-[10px] text-slate-400 mt-2">${timeStr}</p>
    `;
    list.appendChild(item);
  });

  if (badge) {
    if (allNotifications.length > 0) {
      badge.textContent = allNotifications.length;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
}

function clearNotifications(event) {
  event.stopPropagation();
  
  db.collection('notifications')
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => doc.ref.delete());
      showToastNotification('🗑️ Notifications cleared', 'success');
      loadNotifications();
    })
    .catch(error => {
      showToastNotification('❌ Error clearing', 'error');
      console.error('Error:', error);
    });
}

// ============================================================================
// INITIALIZATION
// ============================================================================

window.submitTeacherEmotion = submitTeacherEmotion;
window.loadTeacherEmotions = loadTeacherEmotions;
window.submitClassReportAction = submitClassReportAction;
window.unsubmitClassReportAction = unsubmitClassReportAction;
window.loadSubmissionStatuses = loadSubmissionStatuses;
window.saveShoutout = saveShoutout;
window.loadShoutouts = loadShoutouts;
window.deleteShoutout = deleteShoutout;
window.viewShoutoutImage = viewShoutoutImage;
window.previewShoutoutPhoto = previewShoutoutPhoto;
window.loadNotifications = loadNotifications;
window.clearNotifications = clearNotifications;
window.logActivity = logActivity;
window.getRoleFromTeacherName = getRoleFromTeacherName;
window.showToastNotification = showToastNotification;

console.log('✅ Firestore handlers ready');
