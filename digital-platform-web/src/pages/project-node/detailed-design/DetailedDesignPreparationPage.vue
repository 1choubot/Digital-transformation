<template>
  <DetailedDesignNodeLayout
    :workflow="workflow"
    :node="currentNode"
    :loading="context.workspaceLoading"
    :error-message="context.workspaceErrorMessage"
  >
    <section class="detailed-preparation-section">
      <h4>详细设计角色分配</h4>
      <el-form v-if="canAssignDetailedDesignRoles" @submit.prevent="assignRoles">
        <el-descriptions :column="2" border>
          <el-descriptions-item
            v-for="role in singleRoleDefinitions"
            :key="role.roleKey"
            :label="role.label"
          >
            <el-select
              v-model="roleSelections[role.payloadKey]"
              class="role-select"
              :loading="context.solutionDesignRoleCandidatesLoading"
              :disabled="isPending('roles') || context.solutionDesignRoleCandidatesLoading"
              filterable
              :placeholder="`请选择${role.label}`"
            >
              <el-option
                v-for="candidate in roleCandidates(role)"
                :key="candidate.id"
                :label="candidate.name"
                :value="String(candidate.id)"
              />
            </el-select>
          </el-descriptions-item>
          <el-descriptions-item label="专业组成员" :span="2">
            <el-select
              v-model="roleSelections.professionalGroupMemberUserIds"
              class="role-select"
              :loading="context.solutionDesignRoleCandidatesLoading"
              :disabled="isPending('roles') || context.solutionDesignRoleCandidatesLoading"
              multiple
              filterable
              collapse-tags
              collapse-tags-tooltip
              placeholder="请选择专业组成员"
            >
              <el-option
                v-for="candidate in roleCandidates(professionalGroupRole)"
                :key="candidate.id"
                :label="candidate.name"
                :value="String(candidate.id)"
              />
            </el-select>
          </el-descriptions-item>
        </el-descriptions>

        <el-alert
          v-if="context.solutionDesignRoleCandidatesErrorMessage"
          class="role-feedback"
          :title="context.solutionDesignRoleCandidatesErrorMessage"
          type="error"
          :closable="false"
        />
        <el-button
          class="role-save-button"
          type="primary"
          native-type="submit"
          :loading="isPending('roles')"
          :disabled="context.solutionDesignRoleCandidatesLoading"
        >
          保存分配
        </el-button>
      </el-form>

      <el-descriptions v-else :column="2" border>
        <el-descriptions-item
          v-for="role in singleRoleDefinitions"
          :key="role.roleKey"
          :label="role.label"
        >
          {{ roleDisplayName(role) }}
        </el-descriptions-item>
        <el-descriptions-item label="专业组成员" :span="2">
          {{ professionalGroupMemberNames || '-' }}
        </el-descriptions-item>
      </el-descriptions>
    </section>

    <section class="detailed-preparation-section">
      <h4>详细设计阶段工作计划</h4>
      <DetailedDesignUploadSlots
        :slots="slots"
        :is-pending="isPending"
        @upload="handleUpload"
        @download="downloadUpload"
      />
      <div v-if="canViewSubmit" class="detailed-preparation-actions">
        <el-tooltip :disabled="!submitDisabledReason" :content="submitDisabledReason" placement="top">
          <span>
            <el-button
              type="primary"
              :loading="isPending(`submit:${currentNode.nodeKey}`)"
              :disabled="!canSubmitCurrentNode"
              @click="submitNode(currentNode)"
            >
              提交节点
            </el-button>
          </span>
        </el-tooltip>
      </div>
    </section>
  </DetailedDesignNodeLayout>
</template>

<script setup>
import { computed } from 'vue';
import DetailedDesignNodeLayout from '../../../components/project-workspace/detailed-design/DetailedDesignNodeLayout.vue';
import DetailedDesignUploadSlots from '../../../components/project-workspace/detailed-design/DetailedDesignUploadSlots.vue';
import { canRenderDetailedDesignRoleAssignment } from '../../../components/project-workspace/detailed-design/detailedDesignPermissionViewHelpers.js';
import {
  detailedDesignNodePageProps,
  detailedDesignRoleDefinitions,
  useDetailedDesignNodePage
} from '../../../composables/project-stage/detailed-design/useDetailedDesignNodePage.js';
import { filterSolutionDesignRoleCandidates } from '../../../composables/project-stage/solution-design/roleCandidates.js';

const emit = defineEmits(['business-state-changed']);
const props = defineProps(detailedDesignNodePageProps);
const {
  context,
  workflow,
  currentNode,
  slots,
  roleSelections,
  isPending,
  assignRoles,
  handleUpload,
  submitNode,
  downloadUpload
} = useDetailedDesignNodePage(props, emit);

const singleRoleDefinitions = detailedDesignRoleDefinitions.filter((role) => !role.multiple);
const professionalGroupRole = detailedDesignRoleDefinitions.find((role) => role.multiple) || {};
const professionalGroupMemberNames = computed(() => (workflow.value?.professionalGroupMembers || [])
  .map((member) => member.user?.name || member.user?.account)
  .filter(Boolean)
  .join('、'));
const canAssignDetailedDesignRoles = computed(() => canRenderDetailedDesignRoleAssignment(workflow.value));
const canViewSubmit = computed(() =>
  currentNode.value?.permissions?.canViewSubmit === true ||
  currentNode.value?.permissions?.canPrepareSubmit === true ||
  currentNode.value?.permissions?.canSubmit === true
);
const canSubmitCurrentNode = computed(() => currentNode.value?.permissions?.canSubmit === true);
const submitDisabledReason = computed(() => {
  if (canSubmitCurrentNode.value) {
    return '';
  }
  const reasons = currentNode.value?.permissions?.submitBlockingReasons?.length
    ? currentNode.value.permissions.submitBlockingReasons
    : currentNode.value?.blockingReasons || [];
  return reasons.join('；');
});

function roleCandidates(role) {
  return filterSolutionDesignRoleCandidates(role, context.value.solutionDesignRoleCandidates);
}

function roleDisplayName(role) {
  const roleState = workflow.value?.roles?.[role.roleKey];
  return roleState?.user?.name || roleState?.user?.account || '-';
}
</script>

<style scoped>
.detailed-preparation-section {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.detailed-preparation-section h4 {
  margin: 0;
  font-size: 15px;
}

.role-select {
  width: 100%;
}

.role-feedback {
  margin-top: 12px;
}

.role-save-button {
  justify-self: end;
}

.detailed-preparation-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
