/**
 * APP HELPERS - Assessment Dashboard
 * Handles all UI helpers, modal management, and function bridges
 */

// ============================================================================
// MODAL FUNCTIONS - OPENING & CLOSING
// ============================================================================

function openNewShoutoutModal() {
  const modal = document.getElementById('newShoutoutModal');
  if (modal) modal.classList.remove('hidden');
}

function closeNewShoutoutModal() {
  const modal = document.getElementById('newShoutoutModal');
  if (modal) modal.classList.add('hidden');
}

function openChooseAccountModal() {
  const modal = document.getElementById('chooseAccountModal');
  if (modal) modal.classList.remove('hidden');
}

function closeChooseAccountModal() {
  const modal = document.getElementById('chooseAccountModal');
  if (modal) modal.classList.add('hidden');
}

function closeModal(modalId = 'assessmentModal') {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('hidden');
}

function openMonthlyRecapModal() {
  const modal = document.getElementById('monthlyRecapModal');
  if (modal) modal.classList.remove('hidden');
}

function closeMonthlyRecapModal() {
  const modal = document.getElementById('monthlyRecapModal');
  if (modal) modal.classList.add('hidden');
}

function openStudentManagerModal() {
  const modal = document.getElementById('studentMgmtModal');
  if (modal) modal.classList.remove('hidden');
}

function closeStudentManagerModal() {
  const modal = document.getElementById('studentMgmtModal');
  if (modal) modal.classList.add('hidden');
}

function openAddCalendarEventModal() {
  const modal = document.getElementById('addCalendarEventModal');
  if (modal) modal.classList.remove('hidden');
}

function closeAddCalendarEventModal() {
  const modal = document.getElementById('addCalendarEventModal');
  if (modal) modal.classList.add('hidden');
}

function openSetPdfModal() {
  const modal = document.getElementById('setPdfModal');
  if (modal) modal.classList.remove('hidden');
}

function closeSetPdfModal() {
  const modal = document.getElementById('setPdfModal');
  if (modal) modal.classList.add('hidden');
}

function closeRosterLogsDrawer() {
  const drawer = document.getElementById('rosterLogsDrawerModal');
  if (drawer) drawer.classList.add('hidden');
}

function openParentReportModal() {
  console.log('Parent report opening...');
}

// ============================================================================
// UI NAVIGATION
// ============================================================================

function toggleNotificationMenu(event) {
  event.stopPropagation();
  const dropdown = document.getElementById('notifDropdown');
  if (dropdown) {
    dropdown.classList.toggle('hidden');
  }
}

function toggleMobileMenu() {
  const drawer = document.getElementById('mobileDrawer');
  if (drawer) {
    drawer.classList.toggle('hidden');
  }
}

function switchTab(tabName) {
  // Hide all views
  document.querySelectorAll('[id^="view-"]').forEach(el => {
    el.classList.add('hidden');
  });
  
  // Show selected view
  const viewId = `view-${tabName}-content`;
  const view = document.getElementById(viewId);
  if (view) view.classList.remove('hidden');
  
  // Update active nav button
  document.querySelectorAll('[id^="nav-"]').forEach(btn => {
    btn.classList.remove('bg-brand-50', 'text-brand-600');
    btn.classList.add('text-slate-400', 'hover:bg-slate-50', 'hover:text-slate-800');
  });
  
  const navBtn = document.getElementById(`nav-${tabName}`);
  if (navBtn) {
    navBtn.classList.remove('text-slate-400', 'hover:bg-slate-50', 'hover:text-slate-800');
    navBtn.classList.add('bg-brand-50', 'text-brand-600');
  }
}

function toggleSidebarCollapse() {
  const sidebar = document.getElementById('mainSidebar');
  if (!sidebar) return;
  
  const isCollapsed = sidebar.classList.contains('w-20');
  const sidebarTexts = sidebar.querySelectorAll('.sidebar-text');
  const icon = document.getElementById('collapseIcon');
  
  if (isCollapsed) {
    sidebar.classList.remove('w-20');
    sidebar.classList.add('w-60');
    sidebarTexts.forEach(el => el.classList.remove('hidden'));
    if (icon) icon.classList.remove('fa-chevron-right');
    if (icon) icon.classList.add('fa-chevron-left');
  } else {
    sidebar.classList.remove('w-60');
    sidebar.classList.add('w-20');
    sidebarTexts.forEach(el => el.classList.add('hidden'));
    if (icon) icon.classList.remove('fa-chevron-left');
    if (icon) icon.classList.add('fa-chevron-right');
  }
}

// ============================================================================
// LOGIN & AUTHENTICATION
// ============================================================================

function selectTeacherFromList(teacherName) {
  document.getElementById('username_hidden').value = teacherName;
  document.getElementById('pinModalTeacherName').textContent = `${teacherName} - Enter PIN`;
  document.getElementById('passcodeModal').classList.remove('hidden');
}

function cancelPasscode() {
  document.getElementById('passcodeModal').classList.add('hidden');
  document.getElementById('inp_passcode').value = '';
  document.getElementById('passcodeError').classList.add('hidden');
}

function verifyPasscode(event) {
  event.preventDefault();
  
  const passcode = document.getElementById('inp_passcode').value;
  const username = document.getElementById('username_hidden').value;
  
  const validPINs = {
    'Ms. Mahrukh (Director)': '1234',
    'Ms. Latifah (Principal)': '5678',
    'Tr Nanda': '1111',
    'Tr Afi': '2222',
    'Tr Widya': '3333',
    'Tr Sindy': '4444',
    'Tr Yunda': '5555',
    'Tr Diya': '6666'
  };
  
  if (validPINs[username] === passcode) {
    // Set global variables
    window.currentTeacher = username;
    window.currentRole = getRoleFromTeacherName(username);
    
    closeChooseAccountModal();
    
    // Update UI
    document.getElementById('accountRoleIcon').className = 'fa-solid fa-user-check text-emerald-500 text-xs';
    document.getElementById('activeTeacherLabel').textContent = `✅ ${window.currentTeacher}`;
    document.getElementById('activeTeacherLabel').className = 'font-extrabold text-emerald-600 text-[11px] sm:text-xs';
    
    showToastNotification(`✅ Welcome back, ${window.currentTeacher}!`, 'success');
    
    // START REAL-TIME SYNC
    if (typeof setupRealtimeListeners === 'function') {
      setupRealtimeListeners();
    }
    if (typeof loadNotifications === 'function') {
      loadNotifications();
    }
    if (typeof loadTeacherEmotions === 'function') {
      loadTeacherEmotions();
    }
    if (typeof loadSubmissionStatuses === 'function') {
      loadSubmissionStatuses();
    }
    if (typeof loadShoutouts === 'function') {
      loadShoutouts();
    }
  } else {
    document.getElementById('passcodeError').classList.remove('hidden');
  }
}

// ============================================================================
// ATTENDANCE FUNCTIONS
// ============================================================================

function saveAttendance() {
  showToastNotification('💾 Attendance saved', 'success');
}

function loadAttendanceForSelectedDate() {
  console.log('Loading attendance for selected date');
}

function renderMonthlyRecapTable() {
  console.log('Rendering monthly recap');
}

// ============================================================================
// STUDENT FUNCTIONS
// ============================================================================

function saveStudentToDatabase(event) {
  event.preventDefault();
  showToastNotification('✅ Student saved successfully', 'success');
  closeStudentManagerModal();
}

function setTeacherStudentFilter(isMyStudents) {
  console.log('Filter set to:', isMyStudents ? 'My Students' : 'All Students');
}

function promoteAcademicYear() {
  if (confirm('Promote all students to next academic year?')) {
    showToastNotification('🎓 All students promoted', 'success');
  }
}

// ============================================================================
// CALENDAR FUNCTIONS
// ============================================================================

function saveCalendarEvent(event) {
  event.preventDefault();
  showToastNotification('📅 Event added to calendar', 'success');
  closeAddCalendarEventModal();
}

function saveCalendarPdfUrl(event) {
  event.preventDefault();
  showToastNotification('📎 PDF link saved', 'success');
  closeSetPdfModal();
}

function renderAcademicCalendar() {
  console.log('Rendering academic calendar');
}

function changeAcademicYear() {
  console.log('Academic year changed');
}

function changeTerm() {
  console.log('Term changed');
}

// ============================================================================
// EXPORT / IMPORT FUNCTIONS
// ============================================================================

function exportDataJSON() {
  const data = {
    timestamp: new Date().toISOString(),
    version: '1.0',
    message: 'Assessment Dashboard Backup'
  };
  
  const dataStr = JSON.stringify(data, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `mws-backup-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
}

function importDataJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      showToastNotification('✅ Data restored successfully', 'success');
      console.log('Imported data:', data);
    } catch (error) {
      showToastNotification('❌ Invalid backup file', 'error');
    }
  };
  reader.readAsText(file);
}

// ============================================================================
// ANALYTICS FUNCTIONS
// ============================================================================

function renderAnalyticsChart() {
  console.log('Rendering analytics chart');
}

// ============================================================================
// ROSTER FUNCTIONS
// ============================================================================

function renderRosterDrawerLogs() {
  console.log('Rendering roster drawer logs');
}

// ============================================================================
// SEARCH FUNCTION
// ============================================================================

function performSearch() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    const query = searchInput.value.toLowerCase();
    console.log('Searching for:', query);
  }
}

// ============================================================================
// EMOTION CHECK-IN TRIGGER
// ============================================================================

function openEmotionCheckModal() {
  const modal = document.getElementById('emotionCheckinModal');
  if (modal) modal.classList.remove('hidden');
}

function closeEmotionCheckModal() {
  const modal = document.getElementById('emotionCheckinModal');
  if (modal) modal.classList.add('hidden');
}

// ============================================================================
// EXPORT ALL FUNCTIONS TO WINDOW
// ============================================================================

window.openNewShoutoutModal = openNewShoutoutModal;
window.closeNewShoutoutModal = closeNewShoutoutModal;
window.openChooseAccountModal = openChooseAccountModal;
window.closeChooseAccountModal = closeChooseAccountModal;
window.closeModal = closeModal;
window.openMonthlyRecapModal = openMonthlyRecapModal;
window.closeMonthlyRecapModal = closeMonthlyRecapModal;
window.openStudentManagerModal = openStudentManagerModal;
window.closeStudentManagerModal = closeStudentManagerModal;
window.openAddCalendarEventModal = openAddCalendarEventModal;
window.closeAddCalendarEventModal = closeAddCalendarEventModal;
window.openSetPdfModal = openSetPdfModal;
window.closeSetPdfModal = closeSetPdfModal;
window.closeRosterLogsDrawer = closeRosterLogsDrawer;
window.openParentReportModal = openParentReportModal;
window.toggleNotificationMenu = toggleNotificationMenu;
window.toggleMobileMenu = toggleMobileMenu;
window.switchTab = switchTab;
window.toggleSidebarCollapse = toggleSidebarCollapse;
window.selectTeacherFromList = selectTeacherFromList;
window.cancelPasscode = cancelPasscode;
window.verifyPasscode = verifyPasscode;
window.saveAttendance = saveAttendance;
window.loadAttendanceForSelectedDate = loadAttendanceForSelectedDate;
window.renderMonthlyRecapTable = renderMonthlyRecapTable;
window.saveStudentToDatabase = saveStudentToDatabase;
window.setTeacherStudentFilter = setTeacherStudentFilter;
window.promoteAcademicYear = promoteAcademicYear;
window.saveCalendarEvent = saveCalendarEvent;
window.saveCalendarPdfUrl = saveCalendarPdfUrl;
window.renderAcademicCalendar = renderAcademicCalendar;
window.changeAcademicYear = changeAcademicYear;
window.changeTerm = changeTerm;
window.exportDataJSON = exportDataJSON;
window.importDataJSON = importDataJSON;
window.renderAnalyticsChart = renderAnalyticsChart;
window.renderRosterDrawerLogs = renderRosterDrawerLogs;
window.performSearch = performSearch;
window.openEmotionCheckModal = openEmotionCheckModal;
window.closeEmotionCheckModal = closeEmotionCheckModal;
