<template>
  <article class="approval-review-card">
    <header class="approval-review-card__heading">
      <div>
        <strong>{{ title }}</strong>
        <small v-if="description">{{ description }}</small>
      </div>
      <el-tag v-if="statusText" :type="statusType">{{ statusText }}</el-tag>
    </header>

    <div v-if="hasActions" class="approval-review-card__body">
      <div v-if="selectionRequired" class="approval-review-card__selection">
        <slot name="selection" :disabled="busy" />
      </div>

      <div v-if="showComment" class="approval-review-card__form">
        <label class="approval-review-card__field-label">
          <strong>{{ commentLabel }}</strong>
          <span v-if="approveCommentRequired">*</span>
          <small v-else>{{ commentHint }}</small>
        </label>
        <el-input
          :model-value="comment"
          type="textarea"
          :rows="3"
          :maxlength="commentMaxLength || undefined"
          :placeholder="commentPlaceholder"
          :disabled="actionState.interactionLocked"
          @update:model-value="$emit('update:comment', $event)"
        />

        <div class="approval-review-card__footer">
          <el-button
            v-if="canApprove"
            type="primary"
            :loading="pendingAction === 'approve'"
            :disabled="actionState.approveDisabled"
            @click="$emit('approve', actionState.normalizedComment)"
          >
            {{ approveText }}
          </el-button>
          <el-button
            v-if="canEnd"
            type="danger"
            :loading="pendingAction === 'end'"
            :disabled="actionState.endDisabled"
            @click="$emit('end', actionState.normalizedComment)"
          >
            {{ endText }}
          </el-button>
          <el-button
            v-if="canReturn"
            type="warning"
            :loading="pendingAction === 'return'"
            :disabled="actionState.returnDisabled"
            @click="$emit('return', actionState.normalizedComment)"
          >
            {{ returnText }}
          </el-button>
        </div>
      </div>

      <div v-else class="approval-review-card__footer">
        <el-button
          v-if="canApprove"
          type="primary"
          :loading="pendingAction === 'approve'"
          :disabled="actionState.approveDisabled"
          @click="$emit('approve', actionState.normalizedComment)"
        >
          {{ approveText }}
        </el-button>
        <el-button
          v-if="canEnd"
          type="danger"
          :loading="pendingAction === 'end'"
          :disabled="actionState.endDisabled"
          @click="$emit('end', actionState.normalizedComment)"
        >
          {{ endText }}
        </el-button>
        <el-button
          v-if="canReturn"
          type="warning"
          :loading="pendingAction === 'return'"
          :disabled="actionState.returnDisabled"
          @click="$emit('return', actionState.normalizedComment)"
        >
          {{ returnText }}
        </el-button>
      </div>
    </div>

    <div v-else class="approval-review-card__body">
      <el-alert :title="readonlyMessage" type="info" show-icon :closable="false" />
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue';
import { buildApprovalActionState } from './approvalActionRules.js';

const props = defineProps({
  title: { type: String, default: '审批处理' },
  description: { type: String, default: '' },
  statusText: { type: String, default: '' },
  statusType: { type: String, default: 'warning' },
  comment: { type: String, default: '' },
  commentLabel: { type: String, default: '评价/退回原因' },
  commentPlaceholder: { type: String, default: '可填写审批意见；退回整改时请明确填写原因和修改要求' },
  commentMaxLength: { type: Number, default: 0 },
  showComment: { type: Boolean, default: true },
  approveCommentRequired: Boolean,
  selectionRequired: Boolean,
  selectionComplete: { type: Boolean, default: true },
  canApprove: Boolean,
  canReturn: Boolean,
  canEnd: Boolean,
  busy: Boolean,
  pendingAction: { type: String, default: '' },
  approveDisabled: Boolean,
  returnDisabled: Boolean,
  endDisabled: Boolean,
  approveText: { type: String, default: '审批通过' },
  returnText: { type: String, default: '退回整改' },
  endText: { type: String, default: '结束项目' },
  readonlyMessage: { type: String, default: '当前审批已锁定或当前账号无审批权限，仅可查看。' }
});

defineEmits(['update:comment', 'approve', 'return', 'end']);

const hasActions = computed(() => props.canApprove || props.canReturn || props.canEnd);
const actionState = computed(() => buildApprovalActionState(props));
const commentHint = computed(() => {
  if (props.canApprove && (props.canReturn || props.canEnd)) {
    return `审批通过选填，${props.canReturn ? '退回整改' : ''}${props.canReturn && props.canEnd ? '或' : ''}${props.canEnd ? '结束项目' : ''}必填`;
  }
  if (props.canReturn) return '退回原因必填';
  if (props.canEnd) return '结束原因必填';
  return '审批意见选填';
});
</script>
