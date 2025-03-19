// Kirk Radio DJ - Premium Features Module
// Manages premium subscriptions, feature gating, and payments

// Premium feature configuration
const premium = {
    enabled: false,
    expiryDate: null,
    tier: null, // 'basic', 'pro', 'ultimate'
    features: [],
    paymentProcessor: 'stripe',
    stripePublicKey: 'pk_test_TYooMQauvdEDq54NiTphI7jx', // Test key - replace with real key in production
    customer: {
        id: null,
        email: null,
        name: null
    },
    subscription: {
        id: null,
        status: null,
        currentPeriodEnd: null
    }
};

// Premium tiers configuration
const premiumTiers = {
    'basic': {
        name: 'Basic',
        price: 5.99,
        priceId: 'price_basic123', // Stripe price ID
        features: [
            'advancedEffects',
            'extendedRecordingTime',
            'removeWatermark',
            'standardSupport'
        ],
        description: 'Get access to extended recording time and advanced effects'
    },
    'pro': {
        name: 'Professional',
        price: 9.99,
        priceId: 'price_pro456', // Stripe price ID
        features: [
            'advancedEffects',
            'extendedRecordingTime',
            'removeWatermark',
            'premiumSounds',
            'prioritySupport',
            'customSkins',
            'broadcastStats'
        ],
        description: 'Full access to professional features and priority support'
    },
    'ultimate': {
        name: 'Ultimate',
        price: 14.99,
        priceId: 'price_ultimate789', // Stripe price ID
        features: [
            'advancedEffects',
            'extendedRecordingTime',
            'removeWatermark',
            'premiumSounds',
            'prioritySupport',
            'customSkins',
            'broadcastStats',
            'multiDeviceSync',
            'dedicatedHosting',
            'whiteLabel'
        ],
        description: 'Everything unlocked with dedicated hosting and white label options'
    }
};

// Feature descriptions for UI
const featureDescriptions = {
    'advancedEffects': {
        name: 'Advanced Effects',
        description: 'Access to premium sound effects, transitions, and audio processing',
        icon: 'fa-sliders-h'
    },
    'extendedRecordingTime': {
        name: 'Extended Recording',
        description: 'Record sessions up to 8 hours with automatic track splitting',
        icon: 'fa-clock'
    },
    'removeWatermark': {
        name: 'No Watermark',
        description: 'Remove Kirk Radio branding from recordings and broadcasts',
        icon: 'fa-eraser'
    },
    'premiumSounds': {
        name: 'Premium Sounds',
        description: 'Access to 500+ premium sound effects and samples',
        icon: 'fa-music'
    },
    'prioritySupport': {
        name: 'Priority Support',
        description: '24/7 priority email and chat support',
        icon: 'fa-headset'
    },
    'customSkins': {
        name: 'Custom Skins',
        description: 'Customize your turntables with exclusive skins',
        icon: 'fa-palette'
    },
    'broadcastStats': {
        name: 'Broadcast Analytics',
        description: 'Detailed listener statistics and engagement metrics',
        icon: 'fa-chart-line'
    },
    'multiDeviceSync': {
        name: 'Multi-Device Sync',
        description: 'Sync your library and settings across all your devices',
        icon: 'fa-sync'
    },
    'dedicatedHosting': {
        name: 'Dedicated Hosting',
        description: 'Dedicated broadcast server for reliable streaming',
        icon: 'fa-server'
    },
    'whiteLabel': {
        name: 'White Label',
        description: 'Completely customize the platform for your brand',
        icon: 'fa-tag'
    }
};

// Initialize premium features
document.addEventListener('DOMContentLoaded', () => {
    initPremiumFeatures();
    
    // Setup event listeners for premium buttons
    const upgradeButtons = document.querySelectorAll('.upgrade-button');
    upgradeButtons.forEach(button => {
        button.addEventListener('click', showPremiumModal);
    });
});

// Initialize premium features and check subscription status
function initPremiumFeatures() {
    console.log('Initializing premium features...');
    
    // Load premium status from localStorage
    loadPremiumStatus();
    
    // Check if subscription is valid
    validateSubscription();
    
    // Update UI based on premium status
    updatePremiumUI();
}

// Load premium status from localStorage
function loadPremiumStatus() {
    try {
        const savedStatus = localStorage.getItem('premiumStatus');
        if (savedStatus) {
            const parsedStatus = JSON.parse(savedStatus);
            
            premium.enabled = parsedStatus.enabled || false;
            premium.expiryDate = parsedStatus.expiryDate || null;
            premium.tier = parsedStatus.tier || null;
            premium.features = parsedStatus.features || [];
            
            if (parsedStatus.customer) {
                premium.customer = parsedStatus.customer;
            }
            
            if (parsedStatus.subscription) {
                premium.subscription = parsedStatus.subscription;
            }
            
            console.log('Loaded premium status:', premium);
        }
    } catch (error) {
        console.error('Error loading premium status:', error);
        resetPremiumStatus();
    }
}

// Save premium status to localStorage
function savePremiumStatus() {
    try {
        localStorage.setItem('premiumStatus', JSON.stringify({
            enabled: premium.enabled,
            expiryDate: premium.expiryDate,
            tier: premium.tier,
            features: premium.features,
            customer: premium.customer,
            subscription: premium.subscription
        }));
    } catch (error) {
        console.error('Error saving premium status:', error);
    }
}

// Reset premium status
function resetPremiumStatus() {
    premium.enabled = false;
    premium.expiryDate = null;
    premium.tier = null;
    premium.features = [];
    premium.customer = {
        id: null,
        email: null,
        name: null
    };
    premium.subscription = {
        id: null,
        status: null,
        currentPeriodEnd: null
    };
    
    savePremiumStatus();
}

// Validate subscription and update status
function validateSubscription() {
    if (!premium.expiryDate) {
        premium.enabled = false;
        return;
    }
    
    const now = new Date();
    const expiry = new Date(premium.expiryDate);
    
    if (now > expiry) {
        console.log('Premium subscription has expired');
        premium.enabled = false;
        showToast('Your premium subscription has expired', 'warning');
    } else {
        // Calculate days remaining
        const daysRemaining = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
        
        if (daysRemaining <= 3) {
            // Warn user about soon expiring subscription
            showToast(`Your premium subscription expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`, 'warning');
        }
    }
}

// Update UI based on premium status
function updatePremiumUI() {
    console.log('Updating premium UI elements...');

    // Update the premium status indicator
    const statusIndicator = document.getElementById('premiumStatusIndicator');
    if (statusIndicator) {
        if (premium.enabled) {
            statusIndicator.innerHTML = `
                <span class="text-green-500"><i class="fas fa-crown mr-1"></i> Premium ${premiumTiers[premium.tier]?.name || ''}</span>
            `;
            statusIndicator.classList.add('premium-active');
        } else {
            statusIndicator.innerHTML = `
                <span class="text-gray-400"><i class="fas fa-crown mr-1"></i> Free</span>
            `;
            statusIndicator.classList.remove('premium-active');
        }
    }

    // Update UI for feature-gated elements
    updateFeatureGatedElements();

    // Update subscription info in settings
    const subscriptionInfo = document.getElementById('subscriptionInfo');
    if (subscriptionInfo) {
        if (premium.enabled) {
            const expiryDate = new Date(premium.expiryDate);
            const expiryFormatted = expiryDate.toLocaleDateString();
            
            subscriptionInfo.innerHTML = `
                <div class="mb-2">
                    <span class="font-semibold text-green-500">${premiumTiers[premium.tier]?.name || 'Premium'} Subscription</span>
                </div>
                <div class="text-sm text-gray-300">Expires: ${expiryFormatted}</div>
                <div class="mt-3">
                    <button id="managePremiumBtn" class="dj-button">
                        <i class="fas fa-cog mr-2"></i> Manage Subscription
                    </button>
                </div>
            `;
            
            // Add event listener for manage button
            const manageBtn = document.getElementById('managePremiumBtn');
            if (manageBtn) {
                manageBtn.addEventListener('click', showManageSubscriptionModal);
            }
        } else {
            subscriptionInfo.innerHTML = `
                <div class="mb-2">
                    <span class="text-gray-400">Free Account</span>
                </div>
                <div class="text-sm text-gray-300">Upgrade to unlock premium features</div>
                <div class="mt-3">
                    <button id="upgradePremiumBtn" class="dj-button bg-gradient-to-r from-purple-600 to-blue-500">
                        <i class="fas fa-crown mr-2"></i> Upgrade to Premium
                    </button>
                </div>
            `;
            
            // Add event listener for upgrade button
            const upgradeBtn = document.getElementById('upgradePremiumBtn');
            if (upgradeBtn) {
                upgradeBtn.addEventListener('click', showPremiumModal);
            }
        }
    }

    // Update any premium-only features buttons/notifications
    const premiumButtons = document.querySelectorAll('.premium-feature');
    premiumButtons.forEach(button => {
        const featureId = button.dataset.feature;
        
        if (featureId && hasFeature(featureId)) {
            // User has access to this feature
            button.classList.remove('feature-locked');
            button.classList.add('feature-unlocked');
            
            // Remove any lock icons and tooltips
            const lockIcon = button.querySelector('.feature-lock-icon');
            if (lockIcon) {
                lockIcon.remove();
            }
        } else {
            // Feature is locked
            button.classList.add('feature-locked');
            button.classList.remove('feature-unlocked');
            
            // Make sure we have a lock icon
            if (!button.querySelector('.feature-lock-icon')) {
                const lockIcon = document.createElement('i');
                lockIcon.className = 'fas fa-lock feature-lock-icon';
                button.appendChild(lockIcon);
                
                // Add tooltip to explain this is premium
                button.setAttribute('title', 'Premium feature - Upgrade to unlock');
                
                // Optional: Replace the original click event
                button.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Show the premium modal
                    showPremiumModal();
                });
            }
        }
    });
}

// Update UI elements based on feature gating
function updateFeatureGatedElements() {
    // Advanced effects section
    const advancedEffectsSection = document.getElementById('advancedEffectsSection');
    if (advancedEffectsSection) {
        advancedEffectsSection.classList.toggle('hidden', !hasFeature('advancedEffects'));
    }
    
    // Extended recording controls
    const extendedRecordingOptions = document.getElementById('extendedRecordingOptions');
    if (extendedRecordingOptions) {
        extendedRecordingOptions.classList.toggle('hidden', !hasFeature('extendedRecordingTime'));
    }
    
    // Premium sounds section
    const premiumSoundsSection = document.getElementById('premiumSoundsSection');
    if (premiumSoundsSection) {
        premiumSoundsSection.classList.toggle('hidden', !hasFeature('premiumSounds'));
    }
    
    // Custom skins selector
    const skinsSelector = document.getElementById('skinsSelector');
    if (skinsSelector) {
        skinsSelector.classList.toggle('hidden', !hasFeature('customSkins'));
    }
    
    // Broadcast stats section
    const broadcastStatsSection = document.getElementById('broadcastStatsSection');
    if (broadcastStatsSection) {
        broadcastStatsSection.classList.toggle('hidden', !hasFeature('broadcastStats'));
    }
    
    // White label settings
    const whiteLabelSettings = document.getElementById('whiteLabelSettings');
    if (whiteLabelSettings) {
        whiteLabelSettings.classList.toggle('hidden', !hasFeature('whiteLabel'));
    }
    
    // Update watermark visibility
    const watermarks = document.querySelectorAll('.kirk-watermark');
    watermarks.forEach(watermark => {
        watermark.classList.toggle('hidden', hasFeature('removeWatermark'));
    });
}

// Check if user has access to a specific feature
function hasFeature(featureId) {
    if (!premium.enabled) return false;
    
    // If the user's tier includes this feature
    if (premium.tier && premiumTiers[premium.tier]) {
        return premiumTiers[premium.tier].features.includes(featureId);
    }
    
    // Or if the feature is directly granted to the user
    return premium.features.includes(featureId);
}

// Show the premium upgrade modal
function showPremiumModal() {
    console.log('Showing premium upgrade modal');
    
    // Create the modal container
    const modalContainer = document.createElement('div');
    modalContainer.className = 'fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 premium-modal-container';
    modalContainer.style.backdropFilter = 'blur(5px)';
    
    // Create the modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'bg-[#1a1a1a] rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col';
    
    // Create header with gradient
    const header = document.createElement('div');
    header.className = 'bg-gradient-to-r from-purple-600 to

/**
 * premium.js - Premium features and subscription management for Virtual Turntables
 * 
 * This module handles premium feature activation, payment processing,
 * subscription management, and feature gating logic.
 */

// Configuration
const STRIPE_PUBLIC_KEY = 'pk_test_51MzFakEKey'; // Replace with actual Stripe public key in production
const PREMIUM_PLANS = {
  monthly: {
    id: 'price_1NhGDJHDudbGC837Xj7T9i6K',
    name: 'Monthly Premium',
    price: 9.99,
    interval: 'month',
    features: ['highQualityExport', 'advancedEffects', 'unlimitedBroadcast', 'customBranding', 'prioritySupport']
  },
  yearly: {
    id: 'price_1NhGDlHDudbGC837bSzl6vlW',
    name: 'Yearly Premium',
    price: 99.99,
    interval: 'year',
    features: ['highQualityExport', 'advancedEffects', 'unlimitedBroadcast', 'customBranding', 'prioritySupport', 'exclusiveContent']
  }
};

// Premium state
let premiumState = {
  enabled: false,
  plan: null,
  expiryDate: null,
  features: []
};

// Stripe instance
let stripe;

/**
 * Initialize premium functionality
 */
function initPremium() {
  // Load Stripe.js
  loadStripeJS();
  
  // Set up premium UI elements
  setupPremiumUI();
  
  // Check for existing subscription
  checkExistingSubscription();
  
  // Add event listeners
  document.addEventListener('DOMContentLoaded', () => {
    // Premium button click handler
    const premiumButton = document.getElementById('premium-button');
    if (premiumButton) {
      premiumButton.addEventListener('click', showPremiumModal);
    }
    
    // Close modal button
    const closeModalButtons = document.querySelectorAll('.close-modal');
    closeModalButtons.forEach(button => {
      button.addEventListener('click', hidePremiumModal);
    });
    
    // Plan selection handlers
    const planButtons = document.querySelectorAll('.plan-select-button');
    planButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const plan = e.target.getAttribute('data-plan');
        selectPlan(plan);
      });
    });
  });
}

/**
 * Load Stripe.js dynamically
 */
function loadStripeJS() {
  const script = document.createElement('script');
  script.src = 'https://js.stripe.com/v3/';
  script.onload = () => {
    // Initialize Stripe
    stripe = Stripe(STRIPE_PUBLIC_KEY);
    console.log('Stripe.js loaded successfully');
  };
  document.head.appendChild(script);
}

/**
 * Set up premium UI elements
 */
function setupPremiumUI() {
  // Create premium modal if it doesn't exist
  if (!document.getElementById('premium-modal')) {
    const modalHTML = `
      <div id="premium-modal" class="modal">
        <div class="modal-content">
          <div class="modal-header">
            <h2>Upgrade to Kirk Radio Premium</h2>
            <span class="close-modal">&times;</span>
          </div>
          <div class="modal-body">
            <div class="plans-container">
              <div class="plan-card" data-plan="monthly">
                <h3>Monthly Premium</h3>
                <div class="plan-price">$9.99<span>/month</span></div>
                <ul class="plan-features">
                  <li>High Quality Export (320kbps)</li>
                  <li>Advanced Effects Suite</li>
                  <li>Unlimited Broadcasting Time</li>
                  <li>Custom Branding Options</li>
                  <li>Priority Support</li>
                </ul>
                <button class="plan-select-button" data-plan="monthly">Select Plan</button>
              </div>
              <div class="plan-card recommended" data-plan="yearly">
                <div class="recommended-badge">Best Value</div>
                <h3>Yearly Premium</h3>
                <div class="plan-price">$99.99<span>/year</span></div>
                <div class="plan-saving">Save 16%</div>
                <ul class="plan-features">
                  <li>All Monthly Premium Features</li>
                  <li>Exclusive Content Access</li>
                  <li>Early Access to New Features</li>
                </ul>
                <button class="plan-select-button" data-plan="yearly">Select Plan</button>
              </div>
            </div>
            <div id="payment-container" style="display:none;">
              <h3>Payment Details</h3>
              <div id="payment-element"></div>
              <button id="submit-payment">Subscribe Now</button>
              <div id="payment-message"></div>
              <button class="back-to-plans">Back to Plans</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Append modal to body
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer.firstChild);
    
    // Add premium button to the main interface if it doesn't exist
    if (!document.getElementById('premium-button')) {
      const premiumButton = document.createElement('button');
      premiumButton.id = 'premium-button';
      premiumButton.className = 'premium-button';
      premiumButton.innerHTML = '<span class="premium-icon">⭐</span> Upgrade to Premium';
      
      // Find a suitable place to append the button (e.g., the header or sidebar)
      const headerElement = document.querySelector('header') || document.querySelector('.header');
      if (headerElement) {
        headerElement.appendChild(premiumButton);
      } else {
        // If no header, append to another suitable container
        const container = document.querySelector('.sidebar') || document.querySelector('main');
        if (container) {
          container.prepend(premiumButton);
        }
      }
    }
    
    // Add premium feature indicators throughout the application
    addPremiumFeatureIndicators();
  }
}

/**
 * Add premium feature indicators to premium-only features
 */
function addPremiumFeatureIndicators() {
  // Get all premium features
  const premiumFeatures = [
    { selector: '#advanced-effects', name: 'Advanced Effects', feature: 'advancedEffects' },
    { selector: '#export-high-quality', name: 'High Quality Export', feature: 'highQualityExport' },
    { selector: '.custom-branding', name: 'Custom Branding', feature: 'customBranding' },
    { selector: '#unlimited-broadcast', name: 'Unlimited Broadcasting', feature: 'unlimitedBroadcast' }
  ];
  
  // Add premium indicators
  premiumFeatures.forEach(feature => {
    const elements = document.querySelectorAll(feature.selector);
    elements.forEach(element => {
      if (!element.classList.contains('premium-feature')) {
        // Add premium indicator
        const indicator = document.createElement('div');
        indicator.className = 'premium-indicator';
        indicator.innerHTML = '⭐ Premium';
        indicator.title = `This is a premium feature. Upgrade to unlock ${feature.name}.`;
        
        // Add click handler to show premium modal
        indicator.addEventListener('click', showPremiumModal);
        
        // Add to element
        element.classList.add('premium-feature');
        element.appendChild(indicator);
        
        // Disable element if premium not active
        if (!isPremiumFeatureEnabled(feature.feature)) {
          element.classList.add('premium-locked');
          
          // Add overlay to show feature is locked
          const overlay = document.createElement('div');
          overlay.className = 'premium-overlay';
          overlay.innerHTML = `<div class="premium-lock">🔒</div><p>Premium Feature</p><button class="unlock-premium-button">Unlock</button>`;
          element.appendChild(overlay);
          
          // Add click handler to show premium modal
          overlay.querySelector('.unlock-premium-button').addEventListener('click', showPremiumModal);
        }
      }
    });
  });
}

/**
 * Show premium modal
 */
function showPremiumModal() {
  const modal = document.getElementById('premium-modal');
  if (modal) {
    modal.style.display = 'block';
    
    // Reset modal state
    document.querySelector('.plans-container').style.display = 'flex';
    document.getElementById('payment-container').style.display = 'none';
  }
}

/**
 * Hide premium modal
 */
function hidePremiumModal() {
  const modal = document.getElementById('premium-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

/**
 * Select a subscription plan
 * @param {string} planId - The ID of the selected plan ('monthly' or 'yearly')
 */
function selectPlan(planId) {
  const plan = PREMIUM_PLANS[planId];
  if (!plan) return;
  
  // Show payment form
  document.querySelector('.plans-container').style.display = 'none';
  const paymentContainer = document.getElementById('payment-container');
  paymentContainer.style.display = 'block';
  
  // Set up Stripe payment element
  setupPaymentElement(plan);
  
  // Back to plans button
  const backButton = document.querySelector('.back-to-plans');
  backButton.addEventListener('click', () => {
    document.querySelector('.plans-container').style.display = 'flex';
    paymentContainer.style.display = 'none';
  });
}

/**
 * Set up Stripe payment element
 * @param {Object} plan - The selected subscription plan
 */
function setupPaymentElement(plan) {
  if (!stripe) {
    console.error('Stripe.js not loaded');
    return;
  }
  
  // Create payment intent on server
  createPaymentIntent(plan)
    .then(({ clientSecret }) => {
      // Create and mount the Payment Element
      const elements = stripe.elements({ clientSecret });
      const paymentElement = elements.create('payment');
      paymentElement.mount('#payment-element');
      
      // Set up form submission
      const form = document.getElementById('submit-payment');
      form.addEventListener('click', async (e) => {
        e.preventDefault();
        
        // Disable button during processing
        form.disabled = true;
        document.getElementById('payment-message').textContent = 'Processing payment...';
        
        // Confirm payment
        const { error } = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/premium-confirmation`,
          },
          redirect: 'if_required'
        });
        
        if (error) {
          // Show error message
          const messageElement = document.getElementById('payment-message');
          messageElement.textContent = error.message;
          form.disabled = false;
        } else {
          // Payment succeeded, update premium state
          activatePremium(plan);
          hidePremiumModal();
          showPremiumActivatedMessage();
        }
      });
    })
    .catch(error => {
      console.error('Error creating payment intent:', error);
      document.getElementById('payment-message').textContent = 'Error setting up payment. Please try again.';
    });
}

/**
 * Create payment intent on server
 * @param {Object} plan - The selected subscription plan
 * @returns {Promise} - Promise with payment intent client secret
 */
async function createPaymentIntent(plan) {
  // In a real application, this would call your server to create a PaymentIntent or SetupIntent
  // For demo purposes, we'll simulate a successful response
  
  // Simulate server call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        clientSecret: 'demo_client_secret_' + Math.random().toString(36).substring(2)
      });
    }, 500);
  });
  
  // Real implementation would be:
  /*
  return fetch('/create-subscription', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      planId: plan.id,
    }),
  }).then(response => response.json());
  */
}

/**
 * Check if user has an existing subscription
 */
function checkExistingSubscription() {
  // In a real application, this would check the server for an active subscription
  // For demo purposes, we'll check localStorage
  
  const storedPremium = localStorage.getItem('kirkRadioPremium');
  if (storedPremium) {
    try {
      const premiumData = JSON.parse(storedPremium);
      if (premiumData.enabled && new Date(premiumData.expiryDate) > new Date()) {
        // Valid subscription found
        premiumState = premiumData;
        updatePremiumUI();
        console.log('Active premium subscription found:', premiumState.plan);
      } else {
        // Expired subscription
        console.log('Premium subscription expired');
        localStorage.removeItem('kirkRadioPremium');
      }
    } catch (e) {
      console.error('Error parsing stored premium data:', e);
      localStorage.removeItem('kirkRadioPremium');
    }
  }
}

/**
 * Activate premium features
 * @param {Object} plan - The activated subscription plan
 */
function activatePremium(plan) {
  // Set premium state
  const now = new Date();
  const expiryDate = new Date();
  
  if (plan.interval === 'month') {
    expiryDate.setMonth(expiryDate.getMonth() + 1);
  } else if (plan.interval === 'year') {
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  }
  
  premiumState = {
    enabled: true,
    plan: plan.name,
    expiryDate: expiryDate.toISOString(),
    features: plan.features
  };
  
  // Save to localStorage (in a real app, this would be server-side)
  localStorage.setItem('kirkRadioPremium', JSON.stringify(premiumState));
  
  // Update UI
  updatePremiumUI();
}

/**
 * Update UI based on premium status
 */
function updatePremiumUI() {
  // Update premium button
  const premiumButton = document.getElementById('premium-button');
  if (premiumButton) {
    if (premiumState.enabled) {
      premiumButton.innerHTML = '<span class="premium-active-icon">⭐</span> Premium Active';
      premiumButton.classList.add('premium-active');
      
      // Change button action to show account/manage subscription
      premiumButton.removeEventListener('click', showPremiumModal);
      premiumButton.addEventListener('click', showManageSubscriptionModal);
    } else {
      premiumButton.innerHTML = '<span class="premium-icon">⭐</span> Upgrade to Premium';
      premiumButton.classList.remove('premium-active');
    }
  }
  
  

/**
 * Kirk Radio - Premium Features Module
 * Handles premium subscriptions, feature gating, and Stripe integration
 */

// Initialize premium state
const KirkRadioPremium = (function() {
    // Premium feature configuration
    const PREMIUM_FEATURES = {
        ADVANCED_EFFECTS: 'advanced_effects',
        HIGH_QUALITY_RECORDING: 'high_quality_recording',
        EXTENDED_BROADCAST: 'extended_broadcast',
        CUSTOM_BRANDING: 'custom_branding',
        PRIORITY_SUPPORT: 'priority_support',
        CLOUD_STORAGE: 'cloud_storage'
    };

    // Feature descriptions for UI
    const FEATURE_DESCRIPTIONS = {
        [PREMIUM_FEATURES.ADVANCED_EFFECTS]: {
            title: 'Advanced Effects',
            description: 'Access to professional audio effects including echo, flanger, reverb, and more',
            free: false
        },
        [PREMIUM_FEATURES.HIGH_QUALITY_RECORDING]: {
            title: 'High Quality Recording',
            description: 'Record at 320kbps MP3 and lossless WAV formats',
            free: false
        },
        [PREMIUM_FEATURES.EXTENDED_BROADCAST]: {
            title: 'Extended Broadcasting',
            description: 'Unlimited broadcast time with higher bitrate options',
            free: false
        },
        [PREMIUM_FEATURES.CUSTOM_BRANDING]: {
            title: 'Custom Branding',
            description: 'Add your own logos and customize the look and feel',
            free: false
        },
        [PREMIUM_FEATURES.PRIORITY_SUPPORT]: {
            title: 'Priority Support',
            description: '24/7 email support with 24-hour response guarantee',
            free: false
        },
        [PREMIUM_FEATURES.CLOUD_STORAGE]: {
            title: 'Cloud Storage',
            description: 'Store your recordings and settings in the cloud',
            free: false
        }
    };

    // Subscription plans
    const PLANS = {
        MONTHLY: {
            id: 'price_monthly',
            name: 'Monthly',
            price: 9.99,
            interval: 'month',
            features: Object.values(PREMIUM_FEATURES)
        },
        YEARLY: {
            id: 'price_yearly',
            name: 'Yearly',
            price: 99.99,
            interval: 'year',
            features: Object.values(PREMIUM_FEATURES),
            savings: '16%'
        },
        PRO: {
            id: 'price_pro',
            name: 'Professional',
            price: 19.99,
            interval: 'month',
            features: [...Object.values(PREMIUM_FEATURES), 'white_label', 'api_access']
        }
    };

    // Premium state
    let state = {
        isAuthenticated: false,
        isPremium: false,
        subscription: null,
        activeFeatures: [],
        expiryDate: null,
        stripeCustomerId: null
    };

    // Initialize Stripe
    let stripe;
    let elements;

    /**
     * Initialize the premium module
     */
    function init() {
        // Load Stripe.js
        loadStripe();
        
        // Check if user is already premium
        checkPremiumStatus();
        
        // Attach event listeners
        attachEventListeners();
        
        // Update UI based on premium status
        updatePremiumUI();
    }

    /**
     * Load Stripe.js dynamically
     */
    function loadStripe() {
        if (window.Stripe) {
            stripe = Stripe('pk_test_TYooMQauvdEDq54NiTphI7jx'); // Replace with actual publishable key
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://js.stripe.com/v3/';
            script.onload = () => {
                stripe = Stripe('pk_test_TYooMQauvdEDq54NiTphI7jx'); // Replace with actual publishable key
                resolve();
            };
            script.onerror = () => {
                console.error('Failed to load Stripe.js');
                reject(new Error('Failed to load Stripe.js'));
            };
            document.head.appendChild(script);
        });
    }

    /**
     * Check if the user is authenticated and has a premium subscription
     */
    function checkPremiumStatus() {
        // Check local storage first
        const savedState = localStorage.getItem('kirkRadioPremiumState');
        if (savedState) {
            try {
                const parsedState = JSON.parse(savedState);
                // Verify if subscription is still valid
                if (parsedState.expiryDate && new Date(parsedState.expiryDate) > new Date()) {
                    state = parsedState;
                    return;
                }
            } catch (e) {
                console.error('Error parsing premium state:', e);
            }
        }

        // If no valid local storage data, check with the server
        // In a real implementation, this would make an API call to your backend
        fetchPremiumStatus()
            .then(premiumState => {
                state = premiumState;
                savePremiumState();
                updatePremiumUI();
            })
            .catch(error => {
                console.error('Error fetching premium status:', error);
            });
    }

    /**
     * Mock function to fetch premium status from server
     * In a real implementation, this would call your backend API
     */
    function fetchPremiumStatus() {
        // This is a mock implementation - replace with actual API call
        return new Promise((resolve) => {
            // Simulate API delay
            setTimeout(() => {
                // Check if we have a cached customer ID
                const customerId = localStorage.getItem('stripeCustomerId');
                if (customerId) {
                    // Simulate a premium user for demo purposes
                    resolve({
                        isAuthenticated: true,
                        isPremium: true,
                        subscription: PLANS.MONTHLY,
                        activeFeatures: Object.values(PREMIUM_FEATURES),
                        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                        stripeCustomerId: customerId
                    });
                } else {
                    // Default to non-premium user
                    resolve({
                        isAuthenticated: false,
                        isPremium: false,
                        subscription: null,
                        activeFeatures: [],
                        expiryDate: null,
                        stripeCustomerId: null
                    });
                }
            }, 300);
        });
    }

    /**
     * Save the current premium state to localStorage
     */
    function savePremiumState() {
        localStorage.setItem('kirkRadioPremiumState', JSON.stringify(state));
    }

    /**
     * Attach event listeners for premium-related UI elements
     */
    function attachEventListeners() {
        // Listen for premium button clicks
        document.addEventListener('click', function(event) {
            // Upgrade button
            if (event.target.matches('.premium-upgrade-btn') || event.target.closest('.premium-upgrade-btn')) {
                event.preventDefault();
                showPremiumModal();
            }
            
            // Close modal button
            if (event.target.matches('.premium-modal-close') || event.target.closest('.premium-modal-close')) {
                event.preventDefault();
                hidePremiumModal();
            }
            
            // Plan selection
            if (event.target.matches('.premium-plan-select') || event.target.closest('.premium-plan-select')) {
                const planBtn = event.target.closest('.premium-plan-select');
                const planId = planBtn.dataset.planId;
                selectPlan(planId);
            }
            
            // Subscribe button
            if (event.target.matches('.premium-subscribe-btn') || event.target.closest('.premium-subscribe-btn')) {
                event.preventDefault();
                handleSubscription();
            }
            
            // Manage subscription button
            if (event.target.matches('.premium-manage-btn') || event.target.closest('.premium-manage-btn')) {
                event.preventDefault();
                showManageSubscription();
            }
        });
    }

    /**
     * Update the UI based on premium status
     */
    function updatePremiumUI() {
        // Update premium indicators
        const premiumIndicators = document.querySelectorAll('.premium-indicator');
        premiumIndicators.forEach(indicator => {
            indicator.classList.toggle('premium-active', state.isPremium);
            if (state.isPremium) {
                indicator.setAttribute('title', `Premium active until ${new Date(state.expiryDate).toLocaleDateString()}`);
            } else {
                indicator.setAttribute('title', 'Upgrade to Premium');
            }
        });

        // Update feature availability
        updateFeatureAvailability();
        
        // Update premium buttons
        const upgradeButtons = document.querySelectorAll('.premium-upgrade-btn');
        const manageButtons = document.querySelectorAll('.premium-manage-btn');
        
        if (state.isPremium) {
            upgradeButtons.forEach(btn => btn.style.display = 'none');
            manageButtons.forEach(btn => btn.style.display = 'block');
        } else {
            upgradeButtons.forEach(btn => btn.style.display = 'block');
            manageButtons.forEach(btn => btn.style.display = 'none');
        }
    }

    /**
     * Update feature availability based on premium status
     */
    function updateFeatureAvailability() {
        // Enable/disable premium features based on subscription
        const premiumElements = document.querySelectorAll('[data-premium-feature]');
        
        premiumElements.forEach(element => {
            const featureId = element.dataset.premiumFeature;
            const isFeatureAvailable = isFeatureEnabled(featureId);
            
            element.classList.toggle('premium-locked', !isFeatureAvailable);
            
            if (!isFeatureAvailable) {
                // If it's a button or control, disable it
                if (element.tagName === 'BUTTON' || element.tagName === 'INPUT' || element.tagName === 'SELECT') {
                    element.disabled = true;
                    element.setAttribute('title', 'Premium feature - Upgrade to unlock');
                }
                
                // Add lock icon if not already present
                if (!element.querySelector('.premium-lock-icon')) {
                    const lockIcon = document.createElement('span');
                    lockIcon.className = 'premium-lock-icon';
                    lockIcon.innerHTML = '🔒';
                    lockIcon.style.marginLeft = '5px';
                    element.appendChild(lockIcon);
                }
            } else {
                // Enable the element if the feature is available
                if (element.tagName === 'BUTTON' || element.tagName === 'INPUT' || element.tagName === 'SELECT') {
                    element.disabled = false;
                    element.removeAttribute('title');
                }
                
                // Remove lock icon if present
                const lockIcon = element.querySelector('.premium-lock-icon');
                if (lockIcon) {
                    lockIcon.remove();
                }
            }
        });
    }

    /**
     * Show the premium upgrade modal
     */
    function showPremiumModal() {
        // Create modal if it doesn't exist
        let modal = document.getElementById('premium-modal');
        if (!modal) {
            modal = createPremiumModal();
            document.body.appendChild(modal);
        }
        
        // Show the modal
        modal.style.display = 'flex';
        
        // Initialize Stripe elements if needed
        initializeStripeElements();
    }

    /**
     * Hide the premium modal
     */
    function hidePremiumModal() {
        const modal = document.getElementById('premium-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Create the premium modal HTML
     */
    function createPremiumModal() {
        const modal = document.createElement('div');
        modal.id = 'premium-modal';
        modal.className = 'premium-modal';
        modal.style.display = 'none';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        modal.style.zIndex = '1000';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'premium-modal-content';
        modalContent.style.backgroundColor = '#fff';
        modalContent.style.borderRadius = '8px';
        modalContent.style.width = '90%';
        modalContent.style.maxWidth = '600px';
        modalContent.style.padding = '20px';
        modalContent.style.position = 'relative';
        
        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'premium-modal-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.style.position = 'absolute';
        closeBtn.style.top = '10px';
        closeBtn.style.right = '10px';
        closeBtn.style.fontSize = '24px';
        closeBtn.style.background = 'none';
        closeBtn.style.border = 'none';
        closeBtn.style.cursor = 'pointer';
        
        // Title
        const title = document.createElement('h2');
        title.textContent = 'Upgrade to Kirk Radio Premium';
        title.style.marginBottom = '20px';
        title.style.color = '#333';
        
        // Plans container
        const plansContainer = document.createElement('div');
        plansContainer.className = 'premium-plans-container';
        plansContainer.style.display = 'flex';
        plansContainer.style.justifyContent = 'space-between';
        plansContainer.style.marginBottom = '30px';
        plansContainer.style.flexWrap = 'wrap';
        
        // Add plans
        Object.entries(PLANS).forEach(([planKey, plan]) => {
            const planCard = document.createElement('div');
            planCard.className = 'premium-plan-card';
            planCard.style.flex = '1';
            planCard.style.minWidth = '180px';
            planCard.style.border = '1px solid #ddd';
            planCard.style.borderRadius = '4px';
            planCard.style.padding = '15px';
            planCard.style.margin = '0 10px 10px 0';
            planCard.style.textAlign = 'center';
            planCard.style.cursor = 'pointer';
            planCard.style.transition = 'all 0.3s ease';
            
            const planName = document.createElement('h3');
            planName.textContent = plan.name;
            planName.style.marginBottom = '10px';
            planName.style.color = '#333';
            
            const planPrice = document.createElement('div');
            planPrice.className = 'premium-plan-price';
            planPrice.innerHTML = `<span style="font-size: 24px; font-weight: bold;">$${plan.price}</span>/${plan.interval}`;
            planPrice.style.marginBottom = '15px';
            
            const planFeatures = document.createElement('

