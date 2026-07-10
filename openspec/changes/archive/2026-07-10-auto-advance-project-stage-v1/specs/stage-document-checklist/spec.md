## ADDED Requirements

### Requirement: 阶段完成继续使用统一资料齐套结果
阶段资料清单 SHALL derive stage completion from existing completionMode, applicability, revision state, online form state, and dedicated workflow projections.

#### Scenario: 自动推进读取统一齐套结果
- **WHEN** 系统判断是否可以自动推进阶段
- **THEN** 系统 SHALL 使用阶段资料清单已有的完成派生结果
- **AND** 系统 SHALL NOT 为自动推进创建第二套资料完成判断

#### Scenario: 不适用资料不阻塞自动推进
- **WHEN** 阶段资料被标记为不适用
- **THEN** 资料清单 SHALL 将该资料视为不阻塞阶段齐套
- **AND** 自动推进 SHALL NOT 因该资料基础状态未提交而阻塞

#### Scenario: 专用 workflow 派生资料参与自动推进
- **WHEN** 阶段资料由专用 workflow 管理
- **THEN** 资料清单 SHALL 使用专用 workflow projection 的完成状态
- **AND** 自动推进 SHALL 使用同一 projection 结果参与阶段门禁

#### Scenario: revision 未满足时阻止自动推进
- **WHEN** 阶段资料存在未完成 revision 或返工要求
- **THEN** 资料清单 SHALL 将该资料视为未完成
- **AND** 自动推进 SHALL NOT 推进该阶段
