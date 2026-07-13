<template>
  <section class="panel stage-advance-panel">
    <div class="panel-heading">
      <div>
        <span class="section-eyebrow">阶段推进</span>
        <h3>手工推进阶段</h3>
        <p class="manual-status-note">
          阶段推进要求当前阶段适用资料按 completionMode 完成，并且当前用户具备推进权限。
          推进只改变当前阶段，不调用文件管理平台。
        </p>
      </div>
      <el-button
        v-if="currentStage && showAdvanceAction" type="primary"
        :disabled="!canAdvanceCurrentStage || pending"
        @click="$emit('advance')"
      >
        {{ pending ? '推进中...' : '推进当前阶段' }}
      </el-button>
    </div>

    <div class="stage-advance-content">
      <section v-if="message" class="state-panel state-panel--inline state-panel--success">
        <p>{{ message }}</p>
      </section>

      <section v-if="errorMessage" class="state-panel state-panel--inline state-panel--error">
        <p>{{ errorMessage }}</p>
      </section>

      <template v-if="isProjectEnded">
        <p class="stage-advance-status">项目已结束，不能继续推进立项通知、方案设计或后续阶段。</p>
        <p v-if="endedReason" class="stage-advance-blocked">结束原因：{{ endedReason }}</p>
      </template>

      <template v-else-if="isProjectCompleted">
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
          </div>
        </div>

        <div class="stage-advance-summary">
          <div>
            <span>门禁资料总数</span>
            <strong>{{ currentStageCompleteness?.requiredTotal ?? '-' }}</strong>
          </div>
          <div>
            <span>适用已完成</span>
            <strong>{{ currentStageCompleteness?.completedRequiredCount ?? currentStageCompleteness?.confirmedRequiredCount ?? '-' }}</strong>
          </div>
          <div>
            <span>未完成适用</span>
            <strong>{{ currentStageCompleteness?.incompleteRequiredCount ?? '-' }}</strong>
          </div>
          <div>
            <span>完成百分比</span>
            <strong>{{ currentStageCompleteness ? `${currentStageCompleteness.completionPercent}%` : '-' }}</strong>
          </div>
        </div>

        <div class="stage-advance-missing">
          <strong>当前阶段未按完成规则完成的适用资料</strong>
          <ul v-if="missingDocuments.length > 0">
            <li v-for="document in missingDocuments" :key="document.id || document.documentCode">
              <span class="mono">{{ document.documentCode }}</span>
              <span>{{ document.documentName }}</span>
              <span>{{ formatCompletionMode(document.completionMode) }}</span>
              <span>{{ formatCompletionStatus(document.completionStatus) }}</span>
              <StatusBadge :status="document.status" />
            </li>
          </ul>
          <p v-else>当前阶段适用资料均已按完成规则完成。</p>
        </div>

        <p v-if="currentStageCompleteness && !canAdvanceCurrentStage" class="stage-advance-blocked">
          当前阶段资料未按完成规则齐套，或当前账号无推进权限。
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
import { formatCompletionMode, formatCompletionStatus } from '../../utils/format.js';

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
  isProjectEnded: {
    type: Boolean,
    default: false
  },
  endedReason: {
    type: String,
    default: ''
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
