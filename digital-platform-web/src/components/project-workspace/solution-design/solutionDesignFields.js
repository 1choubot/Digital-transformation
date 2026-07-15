const imageDescription = '最多 3 张 png/jpg/jpeg 图片，不支持附件、OLE、PDF 或文件平台归档。';

function imageField(key, label) {
  return {
    key,
    label,
    maxImages: 3,
    description: imageDescription
  };
}

// The dedicated analysis page renders fields by business section and relies on
// image fields being attached to their corresponding description fields.
export const analysisSections = [
  {
    key: 'environmentRequirements',
    title: '环境要求',
    fields: [
      { key: 'workingTemperatureMin', label: '工作温度最小值', description: '填写工作温度下限，模板自动补充 ℃。' },
      { key: 'workingTemperatureMax', label: '工作温度最大值', description: '填写工作温度上限，模板自动补充 ℃。' },
      { key: 'storageTemperatureMin', label: '储存温度最小值', description: '填写储存温度下限，模板自动补充 ℃。' },
      { key: 'storageTemperatureMax', label: '储存温度最大值', description: '填写储存温度上限，模板自动补充 ℃。' },
      { key: 'workingHumidityMin', label: '工作湿度最小值', description: '填写工作湿度下限，模板自动补充 %。' },
      { key: 'workingHumidityMax', label: '工作湿度最大值', description: '填写工作湿度上限，模板自动补充 %。' },
      { key: 'storageHumidityMin', label: '储存湿度最小值', description: '填写储存湿度下限，模板自动补充 %。' },
      { key: 'storageHumidityMax', label: '储存湿度最大值', description: '填写储存湿度上限，模板自动补充 %。' },
      { key: 'noiseLimitValue', label: '噪音上限', description: '只填写数值或文本值，模板固定 ≤ 和 dB。' },
      { key: 'ipProtectionLevel', label: 'IP 防护等级', description: '只填写 IP 后面的等级值。' },
      { key: 'antiCorrosionGrade', label: '防腐等级' },
      { key: 'altitudeLimitValue', label: '海拔高度上限', description: '只填写数值或文本值，模板固定 ≤ 和 m。' },
      { key: 'explosionProofRequirement', label: '防爆要求', type: 'textarea', rows: 3 }
    ]
  },
  {
    key: 'siteConditions',
    title: '场地情况',
    fields: [
      {
        key: 'siteConditionDescription',
        label: '可用场地尺寸/场地情况说明',
        type: 'textarea',
        rows: 4,
        description: '填写可用场地尺寸和场地情况；如有图纸可在下方上传，生成项目方案分析表时按上传顺序嵌入。',
        imageField: imageField('siteConditionImages', '可用场地尺寸/场地情况图片')
      },
      { key: 'powerSupply', label: '电源' },
      { key: 'airSupply', label: '气源' },
      { key: 'hydraulicSource', label: '液压源' },
      { key: 'liftingEquipment', label: '吊装设备', type: 'textarea', rows: 3 }
    ]
  },
  {
    key: 'workpieceDescription',
    title: '工件描述',
    fields: [
      {
        key: 'workpieceDescription',
        label: '工件描述',
        type: 'textarea',
        rows: 6,
        required: true,
        description: '填写工件外形尺寸、质量、材质、数量、图纸情况；如有图片可在下方上传并按顺序嵌入 Excel。',
        imageField: imageField('workpieceImages', '工件描述图片')
      }
    ]
  },
  {
    key: 'operationProcess',
    title: '作业工艺',
    fields: [
      {
        key: 'operationProcessDescription',
        label: '作业工艺说明',
        type: 'textarea',
        rows: 8,
        required: true,
        description: '填写做什么、怎么做和工艺文件情况；如有工艺图片可在下方上传并按顺序嵌入 Excel。',
        imageField: imageField('operationProcessImages', '作业工艺图片')
      }
    ]
  },
  {
    key: 'targets',
    title: '目标',
    fields: [
      {
        key: 'projectTargetDescription',
        label: '目标说明',
        type: 'textarea',
        rows: 5,
        required: true,
        description: '填写自动化环节、节拍、人机交互模式、价格、工期；如有辅助图片可在下方上传并按顺序嵌入 Excel。',
        imageField: imageField('projectTargetImages', '目标图片')
      }
    ]
  }
];

// Keep flat exports for callers that do not need the page's section layout.
export const analysisFields = analysisSections.flatMap((section) => section.fields);
export const analysisImageFields = analysisFields
  .filter((field) => field.imageField)
  .map((field) => field.imageField);
