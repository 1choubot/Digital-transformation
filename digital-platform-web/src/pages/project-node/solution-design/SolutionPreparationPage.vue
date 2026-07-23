<template>
  <SolutionDesignNodeLayout
    :workflow="workflow"
    :node="currentNode"
    :loading="context.solutionDesignLoading"
    :error-message="context.solutionDesignErrorMessage"
  >
    <section class="solution-section">
      <h4>指定项目组成员</h4>
      <el-form v-if="workflow?.permissions?.canAssignRoles" @submit.prevent="assignRoles">
        <el-descriptions class="solution-role-table" :column="2" border>
          <el-descriptions-item
            v-for="role in solutionDesignRoleDefinitions"
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
        </el-descriptions>

        <el-alert
          v-if="context.solutionDesignRoleCandidatesErrorMessage"
          class="role-feedback"
          :title="context.solutionDesignRoleCandidatesErrorMessage"
          type="error"
          :closable="false"
        />
        <div class="solution-role-actions">
          <el-button
            type="primary"
            native-type="submit"
            :loading="isPending('roles')"
            :disabled="context.solutionDesignRoleCandidatesLoading"
          >
            保存分配
          </el-button>
        </div>
      </el-form>

      <el-descriptions v-else class="solution-role-table" :column="2" border>
        <el-descriptions-item
          v-for="role in solutionDesignRoleDefinitions"
          :key="role.roleKey"
          :label="role.label"
        >
          {{ workflow?.roles?.[role.roleKey]?.user?.name || workflow?.roles?.[role.roleKey]?.user?.account || '-' }}
        </el-descriptions-item>
      </el-descriptions>
    </section>


    <h4>编写方案设计阶段工作计划</h4>
    <SolutionUploadSlots
      :slots="slots"
      :is-pending="isPending"
      @upload="handleUpload"
      @download="downloadUpload"
      @mark-exemption="markUploadExemption"
      @cancel-exemption="cancelUploadExemption"
    />
    <SolutionNodeActions
      v-if="currentNode"
      :node="currentNode"
      :is-pending="isPending"
      :comment="returnReasons[nodeKey] || ''"
      @update:comment="returnReasons[nodeKey] = $event"
      @submit="submitNode(nodeKey)"
      @approve="approveNode(nodeKey, { comment: $event })"
      @return="returnNode(nodeKey)"
    />
  </SolutionDesignNodeLayout>
</template>

<script setup>
import SolutionDesignNodeLayout from '../../../components/project-workspace/solution-design/SolutionDesignNodeLayout.vue';
import SolutionUploadSlots from '../../../components/project-workspace/solution-design/SolutionUploadSlots.vue';
import SolutionNodeActions from '../../../components/project-workspace/solution-design/SolutionNodeActions.vue';
import {
  solutionDesignNodePageProps,
  solutionDesignRoleDefinitions,
  useSolutionDesignNodePage
} from '../../../composables/project-stage/solution-design/useSolutionDesignNodePage.js';
import { filterSolutionDesignRoleCandidates } from '../../../composables/project-stage/solution-design/roleCandidates.js';

const emit = defineEmits(['business-state-changed']);
const props = defineProps(solutionDesignNodePageProps);
const {
  context,
  workflow,
  nodeKey,
  currentNode,
  slots,
  roleSelections,
  returnReasons,
  isPending,
  assignRoles,
  handleUpload,
  downloadUpload,
  markUploadExemption,
  cancelUploadExemption,
  submitNode,
  approveNode,
  returnNode
} = useSolutionDesignNodePage(props, emit);

function roleCandidates(role) {
  return filterSolutionDesignRoleCandidates(role, context.value.solutionDesignRoleCandidates);
}
</script>

<style scoped>
.role-select {
  width: 100%;
}

.role-feedback {
  margin-top: 16px;
}

.solution-role-actions {
  display: flex;
  justify-content: flex-end;
  width: 90%;
  margin-top: 16px;
  margin-inline: auto;
}

@media (max-width: 640px) {
  .solution-role-actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
