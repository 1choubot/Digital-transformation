<template>
  <main class="login-page">
    <el-form class="login-panel" @submit.prevent="submitLogin">
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
            <el-input v-model.trim="account" autocomplete="username" placeholder="请输入账号" />
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
            <el-input v-model="password" type="password" show-password autocomplete="current-password" placeholder="请输入密码" />
          </div>
        </label>
      </div>

      <el-button type="primary" native-type="submit" :loading="submitting">登 录</el-button>

      <div class="footer-note">
        <span>© 2026 数字化管理平台</span>
      </div>
    </el-form>

  </main>
</template>

<script setup>
import { ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
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

watch(
  () => props.initialMessage,
  (value) => {
    message.value = value;
    if (value) {
      ElMessage.error(value);
    }
  }
);

async function submitLogin() {
  message.value = '';

  if (!account.value || !password.value) {
    ElMessage.error('请输入账号和密码。');
    return;
  }

  submitting.value = true;

  try {
    const result = await login(account.value, password.value);
    emit('logged-in', result);
  } catch (error) {
    const errorMsg = toReadableApiError(error);
    ElMessage.error(errorMsg);
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

/* 聚焦时改为品牌蓝 */
.input-wrapper:focus-within {
  border-color: #3e63dd;
  box-shadow: 0 0 0 3px rgba(62, 99, 221, 0.1);
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

/* 聚焦图标改为品牌蓝 */
.input-wrapper:focus-within .input-icon {
  stroke: #3e63dd;
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
  background: rgba(62, 99, 221, 0.15);
  color: #0f172a;
}

.input-wrapper input::placeholder {
  color: #94a3b8;
  font-weight: 400;
  font-size: 0.9rem;
}

.input-wrapper .el-input {
  flex: 1;
}

.input-wrapper :deep(.el-input__wrapper) {
  min-height: 42px;
  border-radius: 0 10px 10px 0;
  box-shadow: none;
}

.login-panel > .el-button {
  width: 100%;
  height: 44px;
  margin-top: 0.5rem;
  border-radius: 10px;
}

.footer-note {
  text-align: center;
  margin-top: 2rem;
  font-size: 0.75rem;
  color: #94a3b8;
  letter-spacing: 0.3px;
  font-weight: 400;
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

}
</style>
