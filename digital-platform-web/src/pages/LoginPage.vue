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
