<template>
  <main class="login-page">
    <form class="login-panel" @submit.prevent="submitLogin">
      <div class="brand-header">
        <span class="section-eyebrow">数字化管理平台</span>
        <h1>欢迎登录</h1>
        <p class="subtitle">输入您的凭证以访问平台</p>
      </div>

      <div class="input-group">
        <label class="input-label">
          <span class="label-text">账号</span>
          <div class="input-wrapper">
            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <input v-model.trim="account" type="text" autocomplete="username" placeholder="请输入账号" />
          </div>
        </label>
      </div>

      <div class="input-group">
        <label class="input-label">
          <span class="label-text">密码</span>
          <div class="input-wrapper">
            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <input v-model="password" type="password" autocomplete="current-password" placeholder="请输入密码" />
          </div>
        </label>
      </div>

      <button type="submit" class="primary-button" :disabled="submitting">
        <span v-if="submitting" class="spinner"></span>
        {{ submitting ? '正在登录...' : '登 录' }}
      </button>

      <div class="footer-note">
        <span>© 2026 数字化管理平台</span>
      </div>
    </form>

    <Transition name="toast">
      <div v-if="toastVisible" class="toast" :class="{ 'toast--error': toastType === 'error', 'toast--success': toastType === 'success' }">
        <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>{{ toastMessage }}</span>
        <button class="toast-close" @click="hideToast">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </Transition>
  </main>
</template>

<script setup>
import { ref, watch } from 'vue';
import { login } from '../api/auth.js';
import { toReadableApiError } from '../api/http.js';

const props = defineProps({
  initialMessage: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['logged-in']);

const account = ref('');
const password = ref('');
const message = ref(props.initialMessage);
const submitting = ref(false);

const toastVisible = ref(false);
const toastMessage = ref('');
const toastType = ref('error');
let toastTimer = null;

watch(
  () => props.initialMessage,
  (value) => {
    message.value = value;
    if (value) {
      showToast(value, 'error');
    }
  }
);

function showToast(msg, type = 'error') {
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
  toastMessage.value = msg;
  toastType.value = type;
  toastVisible.value = true;
  toastTimer = setTimeout(() => {
    toastVisible.value = false;
    toastTimer = null;
  }, 3000);
}

function hideToast() {
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
  toastVisible.value = false;
}

async function submitLogin() {
  message.value = '';

  if (!account.value || !password.value) {
    showToast('请输入账号和密码。', 'error');
    return;
  }

  submitting.value = true;

  try {
    const result = await login(account.value, password.value);
    emit('logged-in', result);
  } catch (error) {
    const errorMsg = toReadableApiError(error);
    showToast(errorMsg, 'error');
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  background: #f8fafc;
  padding: 1.5rem;
  position: relative;
}

.login-panel {
  width: 100%;
  max-width: 420px;
  padding: 2.5rem 2.2rem 2.2rem;
  background: #ffffff;
  border-radius: 1.25rem;
  box-shadow: 0 20px 50px rgba(0, 20, 40, 0.08), 0 8px 20px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.7);
  transition: box-shadow 0.25s ease;
}

.login-panel:hover {
  box-shadow: 0 28px 60px rgba(0, 20, 40, 0.16);
}

.brand-header {
  margin-bottom: 2rem;
}

.section-eyebrow {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #64748b;
  background: #f1f5f9;
  padding: 0.2rem 0.8rem;
  border-radius: 20px;
  margin-bottom: 0.5rem;
}

.brand-header h1 {
  font-size: 1.75rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: #0f172a;
  margin: 0.25rem 0 0.25rem 0;
  line-height: 1.2;
}

.subtitle {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0;
  font-weight: 400;
}

.input-group {
  margin-bottom: 1.5rem;
}

.input-label {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  width: 100%;
}

.label-text {
  font-size: 0.8rem;
  font-weight: 500;
  color: #475569;
  letter-spacing: 0.02em;
  margin-left: 0.25rem;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: #ffffff;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  transition: border-color 0.2s, box-shadow 0.2s;
  overflow: hidden;
  padding-left: 0.5rem;
}

.input-wrapper:focus-within {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.input-icon {
  width: 20px;
  height: 20px;
  margin-left: 0.5rem;
  margin-right: 0.3rem;
  stroke: #94a3b8;
  flex-shrink: 0;
  transition: stroke 0.2s;
  z-index: 1;
}

.input-wrapper:focus-within .input-icon {
  stroke: #2563eb;
}

.input-wrapper input {
  flex: 1;
  padding: 0.7rem 1.2rem 0.7rem 0.5rem;
  border: none;
  background: transparent;
  font-size: 0.95rem;
  font-weight: 400;
  color: #0f172a;
  outline: none;
  font-family: inherit;
  background-color: #ffffff;
  box-shadow: none;
  -webkit-appearance: none;
  appearance: none;
  border-radius: 0 10px 10px 0;
  margin-left: 0.3rem;
  padding-left: 0.5rem;
}

.input-wrapper input:focus {
  outline: none;
  box-shadow: none;
  border: none;
}

.input-wrapper input::selection {
  background: rgba(37, 99, 235, 0.15);
  color: #0f172a;
}

.input-wrapper input::placeholder {
  color: #94a3b8;
  font-weight: 400;
  font-size: 0.9rem;
}

.primary-button {
  width: 100%;
  padding: 0.7rem 0;
  margin-top: 0.5rem;
  background: #0f172a;
  color: white;
  font-size: 0.95rem;
  font-weight: 500;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s, box-shadow 0.2s;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  letter-spacing: 0.3px;
}

.primary-button:hover:not(:disabled) {
  background: #1e293b;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
  transform: translateY(-1px);
}

.primary-button:active:not(:disabled) {
  transform: scale(0.98);
}

.primary-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  box-shadow: none;
  background: #475569;
}

.spinner {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2.5px solid rgba(255, 255, 255, 0.25);
  border-top: 2.5px solid white;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.footer-note {
  text-align: center;
  margin-top: 2rem;
  font-size: 0.75rem;
  color: #94a3b8;
  letter-spacing: 0.3px;
  font-weight: 400;
}

.toast {
  position: fixed;
  top: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 1rem 0.7rem 1.2rem;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  font-size: 0.875rem;
  font-weight: 500;
  color: #0f172a;
  z-index: 1000;
  border: 1px solid #f1f5f9;
  max-width: 90%;
}

.toast--error {
  border-left: 4px solid #ef4444;
}

.toast--error .toast-icon {
  stroke: #dc2626;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
}

.toast--success {
  border-left: 4px solid #22c55e;
}

.toast--success .toast-icon {
  stroke: #16a34a;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
}

.toast-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  margin-left: 0.5rem;
  flex-shrink: 0;
  border-radius: 50%;
  transition: background 0.2s;
  color: #94a3b8;
}

.toast-close:hover {
  background: #f1f5f9;
}

.toast-close svg {
  width: 14px;
  height: 14px;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px) scale(0.95);
}

.toast-enter-to {
  opacity: 1;
  transform: translateX(-50%) translateY(0) scale(1);
}

.toast-leave-from {
  opacity: 1;
  transform: translateX(-50%) translateY(0) scale(1);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px) scale(0.95);
}

@media (max-width: 480px) {
  .login-panel {
    padding: 1.5rem 1.25rem 1.5rem;
  }

  .brand-header h1 {
    font-size: 1.5rem;
  }

  .input-wrapper input {
    padding: 0.6rem 1rem 0.6rem 0.5rem;
    font-size: 0.9rem;
  }

  .toast {
    top: 1rem;
    padding: 0.6rem 0.8rem 0.6rem 1rem;
    font-size: 0.8rem;
    max-width: 92%;
  }

  .toast-close {
    width: 20px;
    height: 20px;
  }

  .toast-close svg {
    width: 12px;
    height: 12px;
  }
}
</style>