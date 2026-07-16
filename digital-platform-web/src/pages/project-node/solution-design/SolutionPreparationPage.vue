<template>
    <SolutionDesignNodeLayout :workflow="workflow" :node="currentNode" :loading="context.solutionDesignLoading"
        :error-message="context.solutionDesignErrorMessage">
        <section class="solution-section">
            <h4>项目内角色</h4><el-descriptions :column="2" border><el-descriptions-item
                    v-for="role in solutionDesignRoleDefinitions" :key="role.roleKey"
                    :label="role.label">{{ workflow?.roles?.[role.roleKey]?.user?.name || workflow?.roles?.[role.roleKey]?.user?.account || '-' }}</el-descriptions-item></el-descriptions><el-form
                v-if="workflow?.permissions?.canAssignRoles" label-position="top"
                @submit.prevent="assignRoles"><el-form-item v-for="role in solutionDesignRoleDefinitions"
                    :key="role.payloadKey" :label="role.label"><el-select v-model="roleSelections[role.payloadKey]"
                        :disabled="isPending('roles') || context.responsibilityCandidatesLoading" filterable><el-option
                            v-for="candidate in context.solutionDesignResponsibilityCandidates" :key="candidate.id"
                            :label="candidate.name || candidate.account"
                            :value="String(candidate.id)" /></el-select></el-form-item><el-alert
                    v-if="context.responsibilityCandidatesErrorMessage"
                    :title="context.responsibilityCandidatesErrorMessage" type="error" :closable="false" /><el-button
                    type="primary" native-type="submit" :loading="isPending('roles')"
                    :disabled="context.responsibilityCandidatesLoading">保存角色分配</el-button></el-form>
        </section>
        <SolutionUploadSlots :slots="slots" :is-pending="isPending" :exemption-reasons="exemptionReasons"
            @upload="handleUpload" @download="downloadUpload" @mark-exemption="markUploadExemption"
            @cancel-exemption="cancelUploadExemption"
            @update-exemption-reason="({ slotKey, value }) => exemptionReasons[slotKey] = value" />
        <SolutionNodeActions v-if="currentNode" :node="currentNode" :is-pending="isPending"
            :return-reason="returnReasons[nodeKey] || ''" @update:return-reason="returnReasons[nodeKey] = $event"
            @submit="submitNode(nodeKey)" @approve="approveNode(nodeKey)" @return="returnNode(nodeKey)" />
    </SolutionDesignNodeLayout>
</template>
<script
    setup>    import SolutionDesignNodeLayout from '../../../components/project-workspace/solution-design/SolutionDesignNodeLayout.vue'; import SolutionUploadSlots from '../../../components/project-workspace/solution-design/SolutionUploadSlots.vue'; import SolutionNodeActions from '../../../components/project-workspace/solution-design/SolutionNodeActions.vue'; import { solutionDesignNodePageProps, solutionDesignRoleDefinitions, useSolutionDesignNodePage } from '../../../composables/project-stage/solution-design/useSolutionDesignNodePage.js'; const emit = defineEmits(['business-state-changed']); const props = defineProps(solutionDesignNodePageProps); const { context, workflow, nodeKey, currentNode, slots, localMessage, localError, roleSelections, returnReasons, exemptionReasons, isPending, assignRoles, handleUpload, downloadUpload, markUploadExemption, cancelUploadExemption, submitNode, approveNode, returnNode } = useSolutionDesignNodePage(props, emit);</script>
