<template>
  <section v-if="hasVisibleActions || !hideWhenEmpty" class="solution-actions">
    <header>
      <span class="section-eyebrow">节点动作</span>
      <strong>提交、审批和退回</strong>
    </header>
    <div class="action-row">
      <el-button
        v-if="canShowSubmit"
        type="primary"
        :loading="isPending(`submit:${node.nodeKey}`)"
        :disabled="submitDisabled"
        @click="$emit('submit')"
      >
        提交节点
      </el-button>
      <el-button
        v-if="node.permissions?.canApprove"
        type="primary"
        :loading="isPending(`approve:${node.nodeKey}`)"
        @click="$emit('approve')"
      >
        审批通过
      </el-button>
    </div>
    <div v-if="node.permissions?.canReturn" class="return-box">
      <el-input
        :model-value="returnReason"
        type="textarea"
        :rows="3"
        placeholder="退回原因 *"
        @update:model-value="$emit('update:returnReason', $event)"
      />
      <el-button
        type="danger"
        plain
        :loading="isPending(`return:${node.nodeKey}`)"
        @click="confirmReturn"
      >
        审批退回
      </el-button>
    </div>
    <el-empty
      v-if="!hasVisibleActions && !hideWhenEmpty"
      description="当前账号在该节点没有可执行动作"
      :image-size="48"
    />
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { ElMessageBox } from 'element-plus';

const props = defineProps({
  node: { type: Object, required: true },
  isPending: { type: Function, required: true },
  returnReason: { type: String, default: '' },
  submitDisabled: Boolean,
  hideSubmit: Boolean,
  hideWhenEmpty: Boolean
});
const emit = defineEmits(['submit', 'approve', 'return', 'update:returnReason']);

const canShowSubmit = computed(() => props.node.permissions?.canSubmit && !props.hideSubmit);
const hasVisibleActions = computed(() =>
  canShowSubmit.value || props.node.permissions?.canApprove || props.node.permissions?.canReturn
);

async function confirmReturn() {
  try {
    await ElMessageBox.confirm(`确认退回“${props.node.nodeName || '当前节点'}”吗？`, '退回确认', {
      type: 'warning',
      confirmButtonText: '确认退回',
      cancelButtonText: '取消'
    });
    emit('return');
  } catch {
    // 用户取消时不请求、不刷新
  }
}
</script>
