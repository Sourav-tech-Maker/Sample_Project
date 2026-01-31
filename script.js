// ============================================
// EmailJS Configuration (FREE - 200 emails/month)
// ============================================
// IMPORTANT: Replace these with your EmailJS credentials
// 1. Sign up FREE at https://www.emailjs.com/
// 2. Create an Email Service (Gmail, Outlook, etc.)
// 3. Create an Email Template with variables: {{to_name}}, {{to_email}}, {{plan_name}}, {{tickets}}, {{total_amount}}, {{booking_id}}, {{phone}}, {{event_date}}, {{event_venue}}
// 4. Replace the values below with your own:

const EMAILJS_CONFIG = {
  publicKey: 's5YEYguJ9-qFBamPi',        // Get from EmailJS Dashboard > Account > API Keys
  serviceId: 'service_p8wviyu',        // Get from EmailJS Dashboard > Email Services
  templateId: 'template_3ysmnzh'       // Get from EmailJS Dashboard > Email Templates
};

// ============================================
// Fraud Protection System
// ============================================
const FRAUD_CONFIG = {
  maxFalseAttempts: 2,           // Maximum false payment claims allowed
  blockDurationHours: 8,         // Block duration in hours
  storageKey: 'ew_fraud_data',   // localStorage key for fraud data
  pendingBookingsKey: 'ew_pending_bookings' // Key for pending verifications
};

// Get fraud data from localStorage
const getFraudData = () => {
  try {
    const data = localStorage.getItem(FRAUD_CONFIG.storageKey);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

// Save fraud data to localStorage
const saveFraudData = (data) => {
  localStorage.setItem(FRAUD_CONFIG.storageKey, JSON.stringify(data));
};

// Check if user is blocked
const isUserBlocked = (identifier) => {
  const fraudData = getFraudData();
  const userData = fraudData[identifier];

  if (!userData || !userData.blockedUntil) return false;

  const blockedUntil = new Date(userData.blockedUntil);
  const now = new Date();

  if (now < blockedUntil) {
    // Still blocked
    const remainingMs = blockedUntil - now;
    const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));
    const remainingMins = Math.ceil(remainingMs / (1000 * 60)) % 60;
    return {
      blocked: true,
      remainingTime: `${remainingHours}h ${remainingMins}m`,
      blockedUntil: blockedUntil.toLocaleString()
    };
  } else {
    // Block expired, reset
    delete fraudData[identifier];
    saveFraudData(fraudData);
    return false;
  }
};

// Record a false payment attempt
const recordFalseAttempt = (identifier, bookingData) => {
  const fraudData = getFraudData();

  if (!fraudData[identifier]) {
    fraudData[identifier] = {
      attempts: [],
      falseClaimsCount: 0
    };
  }

  fraudData[identifier].falseClaimsCount++;
  fraudData[identifier].attempts.push({
    timestamp: new Date().toISOString(),
    bookingData: {
      name: bookingData.name,
      email: bookingData.email,
      phone: bookingData.phone,
      plan: bookingData.plan,
      amount: bookingData.totalAmount
    }
  });

  // Check if should be blocked
  if (fraudData[identifier].falseClaimsCount >= FRAUD_CONFIG.maxFalseAttempts) {
    const blockUntil = new Date();
    blockUntil.setHours(blockUntil.getHours() + FRAUD_CONFIG.blockDurationHours);
    fraudData[identifier].blockedUntil = blockUntil.toISOString();

    console.warn(`User ${identifier} has been blocked until ${blockUntil.toLocaleString()}`);
  }

  saveFraudData(fraudData);
  return fraudData[identifier].falseClaimsCount;
};

// Get user's current false attempt count
const getFalseAttemptCount = (identifier) => {
  const fraudData = getFraudData();
  return fraudData[identifier]?.falseClaimsCount || 0;
};

// Reset user's fraud record (call this after verified successful payment)
const resetFraudRecord = (identifier) => {
  const fraudData = getFraudData();
  delete fraudData[identifier];
  saveFraudData(fraudData);
};

// Pending bookings for admin verification
const getPendingBookings = () => {
  try {
    const data = localStorage.getItem(FRAUD_CONFIG.pendingBookingsKey);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

// Get verified bookings
const getVerifiedBookings = () => {
  try {
    const data = localStorage.getItem('ew_verified_bookings');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

// Check for duplicate booking (same phone or email with pending/verified status)
const checkDuplicateBooking = (phone, email) => {
  const pending = getPendingBookings();
  const verified = getVerifiedBookings();

  // Check in pending bookings (only those still pending)
  const pendingDuplicate = pending.find(b =>
    b.verificationStatus === 'pending' &&
    (b.phone === phone || b.email === email)
  );

  if (pendingDuplicate) {
    return {
      isDuplicate: true,
      type: 'pending',
      bookingId: pendingDuplicate.bookingId,
      message: `You already have a pending booking (#${pendingDuplicate.bookingId}). Please wait for verification before making a new booking.`
    };
  }

  // Check in verified bookings
  const verifiedDuplicate = verified.find(b =>
    b.phone === phone || b.email === email
  );

  if (verifiedDuplicate) {
    return {
      isDuplicate: true,
      type: 'verified',
      bookingId: verifiedDuplicate.bookingId,
      message: `You already have a verified booking (#${verifiedDuplicate.bookingId}). Each person can only book once.`
    };
  }

  return { isDuplicate: false };
};

const addPendingBooking = (booking) => {
  const pending = getPendingBookings();
  pending.push({
    ...booking,
    status: 'pending',
    submittedAt: new Date().toISOString()
  });
  localStorage.setItem(FRAUD_CONFIG.pendingBookingsKey, JSON.stringify(pending));
};

// Initialize EmailJS
(function () {
  if (typeof emailjs !== 'undefined') {
    emailjs.init(EMAILJS_CONFIG.publicKey);
    console.log('EmailJS initialized successfully');
  }
})();

// Theme Toggle Functionality
const toggleBtn = document.getElementById("themeToggle");
const toggleIcon = toggleBtn?.querySelector('.toggle-icon');
const body = document.body;

// Initialize theme from localStorage or system preference
const initializeTheme = () => {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (saved === 'light' || (!saved && !prefersDark)) {
    body.classList.add('light');
    if (toggleIcon) toggleIcon.textContent = '☀️';
  } else {
    body.classList.remove('light');
    if (toggleIcon) toggleIcon.textContent = '🌙';
  }
};

// Toggle theme with smooth animation
const toggleTheme = () => {
  const isLight = body.classList.toggle('light');

  if (toggleIcon) {
    // Animate the icon
    toggleIcon.style.transform = 'rotate(360deg) scale(0)';
    toggleIcon.style.transition = 'transform 0.3s ease';

    setTimeout(() => {
      toggleIcon.textContent = isLight ? '☀️' : '🌙';
      toggleIcon.style.transform = 'rotate(0deg) scale(1)';
    }, 150);
  }

  localStorage.setItem('theme', isLight ? 'light' : 'dark');
};

// Event Listeners
if (toggleBtn) {
  toggleBtn.addEventListener('click', toggleTheme);
}

// Initialize on load
initializeTheme();

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (!localStorage.getItem('theme')) {
    if (e.matches) {
      body.classList.remove('light');
      if (toggleIcon) toggleIcon.textContent = '🌙';
    } else {
      body.classList.add('light');
      if (toggleIcon) toggleIcon.textContent = '☀️';
    }
  }
});

// Add subtle parallax effect to background on mouse move
const bgImage = document.querySelector('.bg-image');
if (bgImage) {
  document.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 20;
    const y = (e.clientY / window.innerHeight - 0.5) * 20;
    bgImage.style.transform = `scale(1.1) translate(${x}px, ${y}px)`;
  });
}

// Add hover effect to event card
const eventCard = document.querySelector('.event-card');
if (eventCard) {
  eventCard.addEventListener('mouseenter', () => {
    eventCard.style.transform = 'translateY(-8px) scale(1.01)';
  });

  eventCard.addEventListener('mouseleave', () => {
    eventCard.style.transform = 'translateY(0) scale(1)';
  });
}

// Countdown timer functionality (optional - for future enhancement)
const calculateCountdown = (targetDate) => {
  const now = new Date();
  const target = new Date(targetDate);
  const diff = target - now;

  if (diff <= 0) return null;

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000)
  };
};

// Social link hover effects
document.querySelectorAll('.social-link').forEach(link => {
  link.addEventListener('mouseenter', function () {
    this.style.transform = 'translateY(-4px) scale(1.1)';
  });

  link.addEventListener('mouseleave', function () {
    this.style.transform = 'translateY(0) scale(1)';
  });
});

// ============================================
// Soul Pass / Payment Modal Functionality
// ============================================

let selectedPlanData = {
  name: '',
  price: 0
};

// Format plan name for display
const formatPlanName = (planId) => {
  const names = {
    'early-bird': 'Early Bird',
    'standard': 'Standard',
    'early-bird-premium': 'Early Bird Premium',
    'premium': 'Premium',
    'group': 'Group Package'
  };
  return names[planId] || planId;
};

// Select a plan and open payment modal
const selectPlan = (planId, price) => {
  const modal = document.getElementById('paymentModal');
  const selectedPlanName = document.getElementById('selectedPlanName');
  const selectedPlanPrice = document.getElementById('selectedPlanPrice');
  const totalPrice = document.getElementById('totalPrice');
  const numTickets = document.getElementById('numTickets');

  // Handle group package separately
  if (planId === 'group') {
    // Open contact options for group package
    const contactChoice = confirm(
      'Group Package requires minimum 5 people.\n\n' +
      'Would you like to:\n' +
      '• Click OK to send an email\n' +
      '• Click Cancel to call us'
    );

    if (contactChoice) {
      window.location.href = 'mailto:radha51895@gmail.com?subject=Group Package Inquiry - Echoes Within&body=Hello,%0A%0AI am interested in the Group Package for the Echoes Within event.%0A%0ANumber of people in our group: %0APreferred plan (Standard/Premium): %0A%0APlease contact me with more details.%0A%0AThank you!';
    } else {
      window.location.href = 'tel:+919968532561';
    }
    return;
  }

  // Store selected plan data
  selectedPlanData.name = formatPlanName(planId);
  selectedPlanData.price = price;

  // Update modal content
  selectedPlanName.textContent = selectedPlanData.name;
  selectedPlanPrice.textContent = `₹${price}/-`;

  // Reset ticket count
  numTickets.value = '1';
  updateTotalPrice();

  // Show modal
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Add active state to selected card
  document.querySelectorAll('.pricing-card').forEach(card => {
    card.classList.remove('selected');
  });
  document.querySelector(`[data-plan="${planId}"]`)?.classList.add('selected');
};

// Update total price based on ticket quantity
const updateTotalPrice = () => {
  const numTickets = document.getElementById('numTickets');
  const totalPriceEl = document.getElementById('totalPrice');
  const quantity = parseInt(numTickets.value) || 1;
  const total = selectedPlanData.price * quantity;
  totalPriceEl.textContent = `₹${total.toLocaleString('en-IN')}/-`;
};

// Close payment modal
const closePaymentModal = () => {
  const modal = document.getElementById('paymentModal');
  modal.classList.remove('active');
  document.body.style.overflow = '';

  // Remove selected state from cards
  document.querySelectorAll('.pricing-card').forEach(card => {
    card.classList.remove('selected');
  });
};

// ============================================
// Form Validation Functions
// ============================================

// Validation patterns
const validationPatterns = {
  name: /^[a-zA-Z\s]{3,50}$/,
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^[6-9]\d{9}$/
};

// Error messages
const errorMessages = {
  name: {
    required: 'Please enter your full name',
    invalid: 'Name must be 3-50 characters, letters only'
  },
  email: {
    required: 'Please enter your email address',
    invalid: 'Please enter a valid email (e.g., name@domain.com)'
  },
  phone: {
    required: 'Please enter your phone number',
    invalid: 'Please enter a valid 10-digit Indian mobile number'
  }
};

// Validate individual field
const validateField = (fieldId, value) => {
  const errorEl = document.getElementById(`${fieldId}Error`);
  const successEl = document.getElementById(`${fieldId}Success`);
  const inputEl = document.getElementById(fieldId === 'name' ? 'userName' : fieldId === 'email' ? 'userEmail' : 'userPhone');

  // Reset states
  if (errorEl) errorEl.textContent = '';
  if (errorEl) errorEl.style.display = 'none';
  if (successEl) successEl.style.display = 'none';
  if (inputEl) inputEl.classList.remove('input-error', 'input-success');

  // Check if empty
  if (!value || value.trim() === '') {
    if (errorEl) {
      errorEl.textContent = errorMessages[fieldId].required;
      errorEl.style.display = 'block';
    }
    if (inputEl) inputEl.classList.add('input-error');
    return false;
  }

  // Check pattern
  if (!validationPatterns[fieldId].test(value.trim())) {
    if (errorEl) {
      errorEl.textContent = errorMessages[fieldId].invalid;
      errorEl.style.display = 'block';
    }
    if (inputEl) inputEl.classList.add('input-error');
    return false;
  }

  // Valid
  if (successEl) successEl.style.display = 'block';
  if (inputEl) inputEl.classList.add('input-success');
  return true;
};

// Validate all fields
const validateAllFields = () => {
  const nameInput = document.getElementById('userName');
  const emailInput = document.getElementById('userEmail');
  const phoneInput = document.getElementById('userPhone');

  const isNameValid = validateField('name', nameInput?.value);
  const isEmailValid = validateField('email', emailInput?.value);
  const isPhoneValid = validateField('phone', phoneInput?.value);

  return isNameValid && isEmailValid && isPhoneValid;
};

// Add real-time validation listeners
const setupValidationListeners = () => {
  const nameInput = document.getElementById('userName');
  const emailInput = document.getElementById('userEmail');
  const phoneInput = document.getElementById('userPhone');

  if (nameInput) {
    nameInput.addEventListener('input', () => validateField('name', nameInput.value));
    nameInput.addEventListener('blur', () => validateField('name', nameInput.value));
  }

  if (emailInput) {
    emailInput.addEventListener('input', () => validateField('email', emailInput.value));
    emailInput.addEventListener('blur', () => validateField('email', emailInput.value));
  }

  if (phoneInput) {
    // Only allow numbers
    phoneInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
      validateField('phone', phoneInput.value);
    });
    phoneInput.addEventListener('blur', () => validateField('phone', phoneInput.value));
  }
};

// Initialize validation listeners on page load
document.addEventListener('DOMContentLoaded', setupValidationListeners);

// Store user data for QR modal
let currentBookingData = null;

// Payment timer interval
let paymentTimerInterval = null;

// Handle form submission
const paymentForm = document.getElementById('paymentForm');
if (paymentForm) {
  paymentForm.addEventListener('submit', (e) => {
    e.preventDefault();

    // Validate all fields first
    if (!validateAllFields()) {
      // Shake the form to indicate error
      paymentForm.classList.add('shake');
      setTimeout(() => paymentForm.classList.remove('shake'), 500);
      return;
    }

    const formData = new FormData(paymentForm);
    const phone = formData.get('phone').trim();
    const email = formData.get('email').trim();

    // Check for duplicate bookings
    const duplicateCheck = checkDuplicateBooking(phone, email);
    if (duplicateCheck.isDuplicate) {
      alert(`⚠️ Duplicate Booking Detected!\n\n${duplicateCheck.message}`);
      paymentForm.classList.add('shake');
      setTimeout(() => paymentForm.classList.remove('shake'), 500);
      return;
    }

    currentBookingData = {
      name: formData.get('name').trim(),
      email: email,
      phone: phone,
      tickets: formData.get('tickets'),
      plan: selectedPlanData.name,
      totalAmount: selectedPlanData.price * parseInt(formData.get('tickets'))
    };

    // Show loading state briefly
    const submitBtn = paymentForm.querySelector('.pay-now-btn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Validating...';
    submitBtn.disabled = true;

    // Simulate validation delay then show QR modal
    setTimeout(() => {
      // Reset button
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;

      // Close payment modal and show QR modal
      closePaymentModal();
      showQRPaymentModal(currentBookingData);
    }, 1000);
  });
}

// ============================================
// QR Payment Modal Functions
// ============================================

// Show QR Payment Modal
const showQRPaymentModal = (userData) => {
  const qrModal = document.getElementById('qrPaymentModal');

  // Update QR modal with user data
  document.getElementById('qrUserName').textContent = userData.name;
  document.getElementById('qrPlanName').textContent = userData.plan;
  document.getElementById('qrTicketCount').textContent = userData.tickets + (userData.tickets > 1 ? ' Tickets' : ' Ticket');
  document.getElementById('qrAmount').textContent = `₹${userData.totalAmount.toLocaleString('en-IN')}/-`;
  document.getElementById('instructionAmount').textContent = `₹${userData.totalAmount.toLocaleString('en-IN')}`;

  // Show modal
  qrModal.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Start countdown timer (10 minutes)
  startPaymentTimer(600);
};

// Close QR Modal
const closeQRModal = () => {
  const qrModal = document.getElementById('qrPaymentModal');
  qrModal.classList.remove('active');
  document.body.style.overflow = '';

  // Stop timer
  if (paymentTimerInterval) {
    clearInterval(paymentTimerInterval);
    paymentTimerInterval = null;
  }
};

// Start payment timer
const startPaymentTimer = (seconds) => {
  const timerEl = document.getElementById('paymentTimer');
  let timeLeft = seconds;

  // Clear any existing interval
  if (paymentTimerInterval) {
    clearInterval(paymentTimerInterval);
  }

  const updateTimer = () => {
    const minutes = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    // Change color when time is running low
    if (timeLeft <= 60) {
      timerEl.style.color = '#ff4444';
    } else if (timeLeft <= 180) {
      timerEl.style.color = '#ffa500';
    }

    if (timeLeft <= 0) {
      clearInterval(paymentTimerInterval);
      timerEl.textContent = 'EXPIRED';
      timerEl.style.color = '#ff4444';

      // Show expiry message
      alert('QR Code has expired. Please start the booking process again.');
      closeQRModal();
    }

    timeLeft--;
  };

  updateTimer();
  paymentTimerInterval = setInterval(updateTimer, 1000);
};

// Confirm payment - Updated with fraud protection and verification
const confirmPayment = () => {
  if (!currentBookingData) {
    alert('Something went wrong. Please try again.');
    closeQRModal();
    return;
  }

  // Check if user is blocked
  const userIdentifier = currentBookingData.phone || currentBookingData.email;
  const blockStatus = isUserBlocked(userIdentifier);

  if (blockStatus && blockStatus.blocked) {
    alert(
      `⚠️ Your account has been temporarily blocked due to suspicious activity.\n\n` +
      `You will be unblocked at: ${blockStatus.blockedUntil}\n` +
      `Remaining time: ${blockStatus.remainingTime}\n\n` +
      `If you believe this is a mistake, please contact us at radha51895@gmail.com`
    );
    closeQRModal();
    return;
  }

  // Show verification form instead of simple confirm
  showVerificationForm();
};

// Show transaction verification form
const showVerificationForm = () => {
  const qrModal = document.getElementById('qrPaymentModal');
  const modalContent = qrModal.querySelector('.qr-modal-content');

  const currentAttempts = getFalseAttemptCount(currentBookingData.phone || currentBookingData.email);
  const warningMessage = currentAttempts > 0
    ? `<div class="fraud-warning">
        <i class="fas fa-exclamation-triangle"></i>
        <span>Warning: You have ${currentAttempts} unverified payment claim(s). 
        After ${FRAUD_CONFIG.maxFalseAttempts} false claims, you will be blocked for ${FRAUD_CONFIG.blockDurationHours} hours.</span>
       </div>`
    : '';

  modalContent.innerHTML = `
    <button class="close-modal" onclick="closeQRModal()">
      <i class="fas fa-times"></i>
    </button>
    <div class="verification-form-container">
      <div class="verification-header">
        <div class="verify-icon">
          <i class="fas fa-shield-alt"></i>
        </div>
        <h3>Payment Verification</h3>
        <p>Please enter your UPI transaction details for verification</p>
      </div>
      
      ${warningMessage}
      
      <div class="verification-summary">
        <div class="summary-item">
          <span>Name:</span>
          <strong>${currentBookingData.name}</strong>
        </div>
        <div class="summary-item">
          <span>Amount:</span>
          <strong>₹${currentBookingData.totalAmount.toLocaleString('en-IN')}/-</strong>
        </div>
      </div>
      
      <form id="verificationForm" class="verification-form">
        <div class="form-group">
          <label for="transactionId">
            <i class="fas fa-receipt"></i> UPI Transaction ID / Reference No. <span class="required-star">*</span>
          </label>
          <input type="text" id="transactionId" name="transactionId" 
                 placeholder="e.g., 123456789012 or UTR number" 
                 required minlength="8" maxlength="30">
          <span class="input-hint">Find this in your UPI app payment history</span>
        </div>
        
        <div class="form-group">
          <label for="paymentTime">
            <i class="fas fa-clock"></i> Approximate Payment Time
          </label>
          <input type="time" id="paymentTime" name="paymentTime" value="${new Date().toTimeString().slice(0, 5)}">
        </div>
        
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" id="confirmPaymentDone" required>
            <span>I confirm that I have completed the payment of ₹${currentBookingData.totalAmount.toLocaleString('en-IN')}/- and the above transaction ID is correct.</span>
          </label>
        </div>
        
        <div class="verification-actions">
          <button type="submit" class="submit-verification-btn">
            <i class="fas fa-check-circle"></i>
            <span>Submit for Verification</span>
          </button>
          <button type="button" class="cancel-verification-btn" onclick="goBackToQR()">
            <i class="fas fa-arrow-left"></i>
            <span>Go Back</span>
          </button>
        </div>
      </form>
      
      <div class="verification-note">
        <i class="fas fa-info-circle"></i>
        <p>Your payment will be verified within 15-30 minutes. You will receive a confirmation email once verified.</p>
      </div>
    </div>
  `;

  // Add form submit handler
  document.getElementById('verificationForm').addEventListener('submit', handleVerificationSubmit);
};

// Handle verification form submission
const handleVerificationSubmit = async (e) => {
  e.preventDefault();

  const transactionId = document.getElementById('transactionId').value.trim();
  const paymentTime = document.getElementById('paymentTime').value;
  const confirmCheckbox = document.getElementById('confirmPaymentDone').checked;

  if (!transactionId || transactionId.length < 8) {
    alert('Please enter a valid Transaction ID (minimum 8 characters)');
    return;
  }

  if (!confirmCheckbox) {
    alert('Please confirm that you have completed the payment');
    return;
  }

  // Stop timer
  if (paymentTimerInterval) {
    clearInterval(paymentTimerInterval);
  }

  // Generate booking ID
  const bookingId = 'EW' + Date.now().toString().slice(-8);

  // Create booking record with verification pending
  const bookingRecord = {
    bookingId,
    transactionId,
    paymentTime,
    ...currentBookingData,
    submittedAt: new Date().toISOString(),
    verificationStatus: 'pending'
  };

  // Add to pending bookings for admin verification
  addPendingBooking(bookingRecord);

  // Send confirmation email (booking submitted, pending verification)
  try {
    await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      {
        to_name: currentBookingData.name,
        to_email: currentBookingData.email,
        plan_name: currentBookingData.plan,
        tickets: currentBookingData.tickets,
        total_amount: currentBookingData.totalAmount.toLocaleString('en-IN'),
        booking_id: bookingId,
        phone: currentBookingData.phone,
        event_date: '26th March 2026 | 5:30 PM Onwards',
        event_venue: 'Radisson Blu, Dwarka, Delhi',
        transaction_id: transactionId,
        status: 'Pending Verification'
      }
    );
  } catch (error) {
    console.error('Email sending failed:', error);
  }

  // Show success with pending verification message
  showPendingVerificationSuccess(bookingRecord);

  // Log booking for admin (in real app, this would go to a server)
  console.log('📋 NEW BOOKING SUBMITTED FOR VERIFICATION:', bookingRecord);
};

// Show pending verification success
const showPendingVerificationSuccess = (bookingRecord) => {
  const qrModal = document.getElementById('qrPaymentModal');
  const modalContent = qrModal.querySelector('.qr-modal-content');

  modalContent.innerHTML = `
    <div class="payment-success pending-verification">
      <div class="success-animation">
        <div class="pending-icon">
          <i class="fas fa-hourglass-half"></i>
        </div>
      </div>
      <h3 class="success-title">Booking Submitted!</h3>
      <p class="success-message">
        Thank you, <strong>${bookingRecord.name}</strong>!<br>
        Your payment is being verified.
      </p>
      
      <div class="booking-details">
        <div class="detail-row">
          <span>Booking ID:</span>
          <strong>#${bookingRecord.bookingId}</strong>
        </div>
        <div class="detail-row">
          <span>Transaction ID:</span>
          <strong>${bookingRecord.transactionId}</strong>
        </div>
        <div class="detail-row">
          <span>Plan:</span>
          <strong>${bookingRecord.plan}</strong>
        </div>
        <div class="detail-row">
          <span>Tickets:</span>
          <strong>${bookingRecord.tickets}</strong>
        </div>
        <div class="detail-row">
          <span>Amount:</span>
          <strong>₹${bookingRecord.totalAmount.toLocaleString('en-IN')}/-</strong>
        </div>
        <div class="detail-row status-pending">
          <span>Status:</span>
          <strong><i class="fas fa-clock"></i> Pending Verification</strong>
        </div>
      </div>
      
      <div class="verification-notice info">
        <i class="fas fa-info-circle"></i>
        <div>
          <strong>What happens next?</strong>
          <p>Our team will verify your payment within 15-30 minutes. Once verified, you'll receive a confirmation email at <strong>${bookingRecord.email}</strong></p>
        </div>
      </div>
      
      <div class="verification-notice warning">
        <i class="fas fa-exclamation-triangle"></i>
        <div>
          <strong>Important</strong>
          <p>If your payment cannot be verified, please keep your transaction screenshot ready. False payment claims may result in account restrictions.</p>
        </div>
      </div>
      
      <div class="event-reminder">
        <i class="fas fa-calendar-alt"></i>
        <div>
          <strong>Event Details</strong>
          <p>26th March 2026 | 5:30 PM Onwards<br>Radisson Blu, Dwarka, Delhi</p>
        </div>
      </div>
      
      <button class="close-success-btn" onclick="closeQRModal(); location.reload();">
        <i class="fas fa-thumbs-up"></i>
        Done
      </button>
    </div>
  `;
};

// Go back to QR code view
const goBackToQR = () => {
  showQRPaymentModal(currentBookingData);
};

// Show booking success
const showBookingSuccess = (userData) => {
  const qrModal = document.getElementById('qrPaymentModal');
  const modalContent = qrModal.querySelector('.qr-modal-content');

  modalContent.innerHTML = `
    <div class="payment-success">
      <div class="success-animation">
        <div class="success-icon">
          <i class="fas fa-check-circle"></i>
        </div>
      </div>
      <h3 class="success-title">Booking Submitted!</h3>
      <p class="success-message">
        Thank you, <strong>${userData.name}</strong>!<br>
        Your Soul Pass booking has been received.
      </p>
      <div class="booking-details">
        <div class="detail-row">
          <span>Plan:</span>
          <strong>${userData.plan}</strong>
        </div>
        <div class="detail-row">
          <span>Tickets:</span>
          <strong>${userData.tickets}</strong>
        </div>
        <div class="detail-row">
          <span>Amount Paid:</span>
          <strong>₹${userData.totalAmount.toLocaleString('en-IN')}/-</strong>
        </div>
        <div class="detail-row">
          <span>Booking ID:</span>
          <strong>#EW${Date.now().toString().slice(-8)}</strong>
        </div>
      </div>
      <div class="verification-notice">
        <i class="fas fa-info-circle"></i>
        <p>Your booking is being verified. You will receive a confirmation email at <strong>${userData.email}</strong> and SMS on <strong>+91-${userData.phone}</strong> within 24 hours.</p>
      </div>
      <div class="event-reminder">
        <i class="fas fa-calendar-alt"></i>
        <div>
          <strong>Event Details</strong>
          <p>26th March 2026 | 5:30 PM Onwards<br>Radisson Blu, Dwarka, Delhi</p>
        </div>
      </div>
      <button class="close-success-btn" onclick="closeQRModal(); location.reload();">
        <i class="fas fa-thumbs-up"></i>
        Done
      </button>
    </div>
  `;
};

// Show payment success
const showPaymentSuccess = (userData) => {
  const modalContent = document.querySelector('.modal-content');
  modalContent.innerHTML = `
    <div class="payment-success">
      <div class="success-icon">
        <i class="fas fa-check-circle"></i>
      </div>
      <h3 class="success-title">Booking Confirmed!</h3>
      <p class="success-message">
        Thank you, <strong>${userData.name}</strong>!<br>
        Your Soul Pass has been reserved.
      </p>
      <div class="booking-details">
        <div class="detail-row">
          <span>Plan:</span>
          <strong>${userData.plan}</strong>
        </div>
        <div class="detail-row">
          <span>Tickets:</span>
          <strong>${userData.tickets}</strong>
        </div>
        <div class="detail-row">
          <span>Total:</span>
          <strong>₹${userData.totalAmount.toLocaleString('en-IN')}/-</strong>
        </div>
      </div>
      <p class="confirmation-note">
        <i class="fas fa-envelope"></i>
        A confirmation email has been sent to<br>
        <strong>${userData.email}</strong>
      </p>
      <button class="close-success-btn" onclick="closePaymentModal(); location.reload();">
        <i class="fas fa-thumbs-up"></i>
        Got it!
      </button>
    </div>
  `;
};

// Close modal on escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closePaymentModal();
  }
});

// Add hover effects to pricing cards
document.querySelectorAll('.pricing-card').forEach(card => {
  card.addEventListener('mouseenter', function () {
    // Add subtle glow effect
    this.style.boxShadow = '0 25px 60px rgba(212, 175, 55, 0.3)';
  });

  card.addEventListener('mouseleave', function () {
    if (!this.classList.contains('featured')) {
      this.style.boxShadow = '';
    }
  });
});

