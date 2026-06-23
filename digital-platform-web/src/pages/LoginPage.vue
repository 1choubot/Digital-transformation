<template>
  <main class="login-page">
    <form class="login-panel" @submit.prevent="submitLogin">
      <div>
        <span class="section-eyebrow">数字化管理平台</span>
        <h1>登录</h1>
      </div>

      <div v-if="message" class="state-panel state-panel--error">
        <p>{{ message }}</p>
      </div>

      <label>
        <span>账号</span>
        <input v-model.trim="account" type="text" autocomplete="username" />
      </label>
      <label>
        <span>密码</span>
        <input v-model="password" type="password" autocomplete="current-password" />
      </label>

      <button type="submit" class="primary-button" :disabled="submitting">
        {{ submitting ? '正在登录...' : '登录' }}
      </button>
    </form>
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

watch(
  () => props.initialMessage,
  (value) => {
    message.value = value;
  }
);

async function submitLogin() {
  message.value = '';

  if (!account.value || !password.value) {
    message.value = '请输入账号和密码。';
    return;
  }

  submitting.value = true;

  try {
    const result = await login(account.value, password.value);
    emit('logged-in', result);
  } catch (error) {
    message.value = toReadableApiError(error);
  } finally {
    submitting.value = false;
  }
}
</script>
