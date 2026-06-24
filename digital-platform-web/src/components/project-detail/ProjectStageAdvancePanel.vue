<template>
  <section class="panel stage-advance-panel">
    <div class="panel-heading">
      <div>
        <span class="section-eyebrow">阶段推进</span>
        <h3>手工推进阶段</h3>
        <p class="manual-status-note">
          阶段推进要求当前阶段适用必填资料全部通过资料级审核，并且阶段关口审批已通过。
          推进只改变当前阶段，不代表文件已上传或已归档。
        </p>
      </div>
      <button
        v-if="currentStage && showAdvanceAction"
        type="button"
        class="primary-button"
        :disabled="!canAdvanceCurrentStage || pending"
        @click="$emit('advance')"
      >
        {{ pending ? '推进中...' : '推进当前阶段' }}
      </button>
    </div>

    <div class="stage-advance-content">
      <section v-if="message" class="state-panel state-panel--inline state-panel--success">
        <p>{{ message }}</p>
      </section>

      <section v-if="errorMessage" class="state-panel state-panel--inline state-panel--error">
        <p>{{ errorMessage }}</p>
      </section>

      <template v-if="isProjectCompleted">
        <p class="stage-advance-status">项目已完成，当前阶段为空，无需继续推进。</p>
      </template>

      <template v-else-if="currentStage">
        <div class="stage-advance-current">
          <div>
            <span>当前阶段</span>
            <strong>{{ currentStage.stageName }}</strong>
          </div>
          <div class="stage-advance-current__badges">
            <StatusBadge :status="currentStage.stageStatus" />
            <StatusBadge :status="currentStage.approvalStatus || 'not_submitted'" />
          </div>
        </div>

        <div class="stage-advance-summary">
          <div>
            <span>适用必填总数</span>
            <strong>{{ currentStageCompleteness?.requiredTotal ?? '-' }}</strong>
          </div>
          <div>
            <span>已审核通过适用</span>
            <strong>{{ currentStageCompleteness?.confirmedRequiredCount ?? '-' }}</strong>
          </div>
          <div>
            <span>未完成适用</span>
            <strong>{{ currentStageCompleteness?.incompleteRequiredCount ?? '-' }}</strong>
          </div>
          <div>
            <span>完成百分比</span>
            <strong>{{ currentStageCompleteness ? `${currentStageCompleteness.completionPercent}%` : '-' }}</strong>
          </div>
          <div>
            <span>关口审批状态</span>
            <strong>{{ formatStatus(currentStage.approvalStatus || 'not_submitted') }}</strong>
          </div>
        </div>

        <div class="stage-advance-missing">
          <strong>当前阶段未完成资料级审核的适用必填资料</strong>
          <ul v-if="missingDocuments.length > 0">
            <li v-for="document in missingDocuments" :key="document.id || document.documentCode">
              <span class="mono">{{ document.documentCode }}</span>
              <span>{{ document.documentName }}</span>
              <StatusBadge :status="document.status" />
            </li>
          </ul>
          <p v-else>当前阶段适用必填资料均已通过资料级审核。</p>
        </div>

        <p v-if="currentStage && currentStage.approvalStatus !== 'approved'" class="stage-advance-blocked">
          当前阶段关口审批未通过，不能推进。请先完成阶段关口审批。
        </p>
        <p v-else-if="currentStageCompleteness && !canAdvanceCurrentStage" class="stage-advance-blocked">
          当前阶段资料级审核未齐套，不能推进。请先完成或标记不适用缺失的适用必填资料。
        </p>
        <p v-else-if="!currentStageCompleteness" class="stage-advance-blocked">
          正在读取当前阶段齐套情况，暂不能推进。
        </p>
      </template>

      <template v-else>
        <p class="stage-advance-status">当前阶段为空，暂不能推进。</p>
      </template>
    </div>
  </section>
</template>

<script setup>
import StatusBadge from '../StatusBadge.vue';
import { formatStatus } from '../../utils/format.js';

defineEmits(['advance']);

defineProps({
  currentStage: {
    type: Object,
    default: null
  },
  isProjectCompleted: {
    type: Boolean,
    default: false
  },
  currentStageCompleteness: {
    type: Object,
    default: null
  },
  missingDocuments: {
    type: Array,
    default: () => []
  },
  canAdvanceCurrentStage: {
    type: Boolean,
    default: false
  },
  showAdvanceAction: {
    type: Boolean,
    default: true
  },
  pending: {
    type: Boolean,
    default: false
  },
  message: {
    type: String,
    default: ''
  },
  errorMessage: {
    type: String,
    default: ''
  }
});
</script>
