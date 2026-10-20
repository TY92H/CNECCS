/* CNECCS guided checks. Corpus-based preliminary checks, not an export authorization.
 * No dependency, no remote requests, no persistence. See docs/RULES.md.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CNECCSRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const L = (zh, en) => ({ zh, en });
  const unknown = { value: 'unknown', label: L('不确定 / 暂无资料', 'Not sure / Information unavailable') };
  const opts = rows => rows.map(r => ({ value: r[0], label: L(r[1], r[2]) })).concat([unknown]);
  const yesNo = () => opts([['yes', '是', 'Yes'], ['no', '否', 'No']]);
  const select = (id, zh, en, hintZh, hintEn, options, showWhen) => ({ id, label: L(zh, en), hint: L(hintZh, hintEn), type: 'select', options: options || yesNo(), ...(showWhen ? { showWhen } : {}) });
  const number = (id, zh, en, hintZh, hintEn, unit, showWhen, extra) => ({ id, label: L(zh, en), hint: L(hintZh, hintEn), type: 'number', unit, min: 0, ...(showWhen ? { showWhen } : {}), ...(extra || {}) });
  const text = (id, zh, en, hintZh, hintEn, showWhen) => ({ id, label: L(zh, en), hint: L(hintZh, hintEn), type: 'text', ...(showWhen ? { showWhen } : {}) });
  const when = (id, ...values) => ({ id, values });
  const sourceURLs = {
    CN: 'https://exportcontrol.mofcom.gov.cn/ckgzqdsjk.shtml',
    US: 'https://www.ecfr.gov/on/2026-10-15/title-15/part-774#Supplement-No.-1-to-Part-774'
  };
  const scopeNote = L('这里只核对所列条件。候选匹配、未达到某一阈值或没有匹配，都不等于最终归类或无需许可。请结合完整条目、例外和交易事实复核。', 'These checks cover only the criteria shown. A candidate match, a threshold not met, or no match is not a final classification or licensing decision. Review the complete entry, exclusions, and transaction facts.');
  const definitions = [
    {
      id: 'encryption', title: L('无线连接与加密', 'Wireless connectivity & encryption'),
      description: L('区分整机、模块和软件，梳理密码功能及后续核查路径。', 'Separate finished products, modules, and software, then identify cryptographic functions and the next review steps.'),
      keywords: ['加密', '密码', '无线', '蓝牙', 'wifi', 'wi-fi', 'wi fi', 'bluetooth', 'encryption', 'encrypt', 'cryptography', 'vpn', '路由器', 'router', '智能家电', 'smart appliance', '5a002', '5a992', '5d002'],
      candidateCodes: { CN: ['5A002', '5A004', '5D002'], US: ['5A002', '5A992', '5D002', '5D992'] },
      questions: {
        CN: [
          select('object', '你实际出口的是什么？', 'What is the item being exported?', '整机、独立安全芯片和密码软件需要分别审视。', 'A finished product, standalone security chip, and cryptographic software require separate review.', opts([['finished', '家电或其他整机', 'Appliance or other finished product'], ['chip', '安全芯片 / 模块', 'Security chip / module'], ['device', '独立密码设备', 'Standalone cryptographic equipment'], ['software', '软件 / 技术资料', 'Software / technology']])),
          select('cnFunction', '密码功能属于哪一类？', 'What cryptographic function does it provide?', '中国 5A002 按安全芯片、密码机、VPN、密钥管理、专用密码及量子密码等分项。', 'Chinese entry 5A002 separately addresses security chips, cryptographic devices, VPNs, key management, dedicated equipment, and quantum cryptography.', opts([['incidental', '普通整机的附带通信加密', 'Incidental communication encryption in a finished product'], ['chip', '安全芯片的密码运算', 'Cryptographic operations in a security chip'], ['crypto', '以密码运算为主要功能', 'Cryptographic operations as the primary function'], ['vpn', '以 IPSec / SSL VPN 为主要功能', 'IPSec / SSL VPN as the primary function'], ['key', '服务端密钥管理', 'Server-side key management'], ['sector', '电力、税务、公安或金融专用密码', 'Cryptography dedicated to power, taxation, public security, or finance'], ['quantum', '量子密码', 'Quantum cryptography'], ['analysis', '破解、弱化或绕过密码', 'Cryptanalysis or cryptographic bypass']])),
          text('algorithm', '算法名称和密钥长度是什么？', 'What are the algorithms and key lengths?', '例如 AES-128、RSA-2048；未知时留空，不能仅凭“有 Wi-Fi”推断。', 'For example, AES-128 or RSA-2048. Leave blank if unknown; Wi-Fi alone does not establish the relevant capability.'),
          number('cnRate', '最大加解密 / 加密通信速率', 'Maximum encryption / encrypted communication rate', '按实际子项使用加解密速率或 VPN 加密通信速率；不是无线链路标称速率。不知道可留空。', 'Use the processing or encrypted VPN communication rate required by the applicable subentry, not the advertised wireless link rate. Leave blank if unknown.', 'Gbps', when('cnFunction', 'chip', 'crypto', 'vpn')),
          number('cnSignRate', '最大非对称算法签名速率', 'Maximum asymmetric signature rate', '安全芯片或密码机还可能涉及签名速率；与加解密速率是不同参数。不知道可留空。', 'Security chips and cryptographic devices may also require signature throughput. This is distinct from encryption throughput. Leave blank if unknown.', 'tps', when('cnFunction', 'chip', 'crypto')),
          number('cnObjects', '可管理对象数量', 'Number of managed objects', '服务端密钥管理产品需核实受支持的最大对象数量。', 'For server-side key management products, verify the maximum supported number of managed objects.', '', when('cnFunction', 'key')),
          select('cnSector', '是否专门用于电力、税务、公安或金融领域？', 'Is it dedicated to power, taxation, public security, or finance?', '这一事实可能改变安全芯片或专用密码设备的核查分支。', 'This fact may change the applicable security-chip or dedicated-equipment branch.', null, when('cnFunction', 'chip', 'sector'))
        ],
        US: [
          select('object', '你实际出口的是什么？', 'What is the item being exported?', '美国 5A 类设备和 5D 类软件分别核查；整机与嵌入模块不能直接共用结论。', 'Review U.S. 5A equipment and 5D software separately; do not automatically apply a module classification to its host product.', opts([['finished', '家电或其他整机', 'Appliance or other finished product'], ['module', '通信 / 加密模块', 'Communication / encryption module'], ['network', '网络或信息安全设备', 'Networking or information-security equipment'], ['software', '软件 / 技术资料', 'Software / technology']])),
          select('usPrimary', '产品的主要功能是什么？', 'What is the product’s primary function?', '5A002.a 区分信息安全、通信网络、计算及其他设备；附带加密也需审查相应注释。', '5A002.a distinguishes information security, communications/networking, computing, and other equipment. Incidental encryption requires review of the relevant notes.', opts([['security', '信息安全', 'Information security'], ['network', '通信 / 通用网络', 'Communication / general-purpose networking'], ['computing', '计算 / 存储', 'Computing / storage'], ['civil', '家电或特定民用联网应用', 'Appliance or a specific connected civil application']])),
          select('confidentiality', '是否使用加密保护数据机密性？', 'Does it use cryptography for data confidentiality?', '仅身份认证、数字签名或完整性功能与数据机密性加密的处理不同；需核对实际功能。', 'Authentication, digital signatures, and integrity-only functions are treated differently from data confidentiality; verify the actual functions.'),
          text('algorithm', '算法名称和密钥长度是什么？', 'What are the algorithms and key lengths?', '提供算法、密钥位数及是否可启用；仅“支持 AES”信息不足。不确定可留空。', 'Provide the algorithm, key size, and activation capability. “Supports AES” alone is insufficient. Leave blank if unknown.'),
          select('civilLimited', '加密是否仅支持该特定民用联网应用？', 'Is encryption limited to that specific connected civil application?', '5A002.a 注释 2.j 涉及设备用途、数据范围等条件；需要逐项核对。', 'Note 2.j to 5A002.a includes application and data-scope conditions that must be checked individually.', null, when('usPrimary', 'civil')),
          select('standardsFixed', '是否仅使用公开 / 商用标准，且用户不能轻易改变密码功能？', 'Does it use only published/commercial standards with cryptographic functions the user cannot easily change?', '这只是注释 2.j 的部分条件，不是完整排除结论。', 'This captures only part of Note 2.j, not a complete exclusion determination.', null, when('usPrimary', 'civil')),
          select('massMarket', '是否有可核实的大众市场审查 / 归类资料？', 'Is there verifiable mass-market review or classification documentation?', '5A992.c / 5D992.c 及相关程序不能仅凭零售或“消费级”标签认定。', 'Retail sale or a “consumer-grade” label alone does not establish 5A992.c / 5D992.c treatment or satisfaction of the applicable procedures.')
        ]
      }
    },
    {
      id: 'carbon-fiber', title: L('碳纤维与纤维材料', 'Carbon fiber & fibrous materials'),
      description: L('核对材料形态及比模量、比抗拉强度，区分“或”与“且”。', 'Check material form, specific modulus, and specific tensile strength, preserving OR versus AND criteria.'),
      keywords: ['碳纤维', '芳纶', '芳族聚酰胺', '玻璃纤维', '预浸', 'carbon fiber', 'carbon fibre', 'aramid', 'fiberglass', 'glass fiber', 'prepreg', '1c210', '1c010'],
      candidateCodes: { CN: ['1C210', '1A202', '9C110'], US: ['1C010', '1C210', '1C990', '9C110'] },
      questions: { CN: [], US: [] }
    },
    {
      id: 'machine-tools', title: L('数控机床与加工设备', 'CNC machine tools & machining'),
      description: L('先区分机床功能与测量标准，再核对精度、轴数及排除条件。', 'Identify machining functions and measurement standards before reviewing accuracy, axes, and exclusions.'),
      keywords: ['数控', '机床', '铣床', '车床', '磨床', '加工中心', 'cnc', 'machine tool', 'milling', 'lathe', 'grinding', 'machining', '2b001', '2b201'],
      candidateCodes: { CN: ['2B201', '2D203'], US: ['2B001', '2B201', '2B991'] },
      questions: { CN: [], US: [] }
    },
    {
      id: 'drones', title: L('无人机与相关部件', 'Drones & related components'),
      description: L('区分飞行器、发动机和载荷，并按所选制度核对飞行能力。', 'Separate aircraft, engines, and payloads, then review flight capability under the selected legal regime.'),
      keywords: ['无人机', '无人驾驶', '飞艇', 'drone', 'uav', 'unmanned', '9a012', '9a501', '9a120'],
      candidateCodes: { CN: ['9A012', '9A501'], US: ['9A012', '9A120', '9A610'] },
      questions: { CN: [], US: [] }
    },
    {
      id: 'lasers', title: L('激光器与光学设备', 'Lasers & optical equipment'),
      description: L('收集波长、工作模式和功率等关键参数，定位适用分支。', 'Collect wavelength, operating mode, and power specifications to locate the relevant branch.'),
      keywords: ['激光', 'laser', '6a205', '6a005', '6a995'],
      candidateCodes: { CN: ['6A205'], US: ['6A005', '6A205', '6A995'] },
      questions: { CN: [], US: [] }
    },
    {
      id: 'chemicals', title: L('化学品与 CAS 号码', 'Chemicals & CAS numbers'),
      description: L('核对物质身份、混合物含量和具体条目，不把 CAS 命中当作完整归类。', 'Check substance identity, mixture concentration, and the actual entry; a CAS match alone is not a complete classification.'),
      keywords: ['化学', '化工', '混合物', '氟化', '三乙醇胺', 'chemical', 'cas', 'mixture', 'fluoride', 'triethanolamine', '1c350', '1c450'],
      candidateCodes: { CN: ['1C350', '1C450'], US: ['1C350', '1C355', '1C395'] },
      questions: { CN: [], US: [] }
    }
  ];

  for (const regime of ['CN', 'US']) {
    const us = regime === 'US';
    definitions[1].questions[regime] = [
      select('fiberType', '材料的基本类型是什么？', 'What is the basic material type?', '1C210.a 的碳 / 芳纶使用“或”；1C210.b 的玻璃纤维使用“且”。', 'Carbon/aramid in 1C210.a uses OR; glass fiber in 1C210.b uses AND.', opts([['carbon', '碳纤维 / 纤丝材料', 'Carbon fibrous / filamentary material'], ['aramid', '芳族聚酰胺（芳纶）', 'Aramid fibrous / filamentary material'], ['glass', '玻璃纤维 / 纤丝材料', 'Glass fibrous / filamentary material'], ['prepreg', '预浸料', 'Prepreg'], ['finished', '成型复合结构 / 成品', 'Finished composite structure / article'], ['other', '其他材料', 'Other material']])),
      number('specificModulus', '比模量（不是通常的弹性模量）', 'Specific modulus (not ordinary elastic modulus)', '请填以米为单位的条目定义参数，例如 12700000。GPa 不能直接填入；不知道可留空。', 'Enter the entry-defined quantity in meters, for example 12700000. Do not enter a GPa value directly; leave blank if unknown.', 'm', when('fiberType', 'carbon', 'aramid', 'glass')),
      number('specificStrength', '比抗拉强度（不是通常的抗拉强度）', 'Specific tensile strength (not ordinary tensile strength)', '请填以米为单位的条目定义参数，例如 235000。MPa 不能直接填入；不知道可留空。', 'Enter the entry-defined quantity in meters, for example 235000. Do not enter an MPa value directly; leave blank if unknown.', 'm', when('fiberType', 'carbon', 'aramid', 'glass')),
      select('specificBasis', '参数是否按条目中“比模量 / 比抗拉强度”的定义提供？', 'Were the values provided under the entry’s specific-modulus / specific-strength definitions?', '应由供应商技术资料支持，不能把常规模量、强度或密度值直接代入。', 'Use supplier technical documentation. Do not substitute ordinary modulus, strength, or density values.', null, when('fiberType', 'carbon', 'aramid', 'glass')),
      number('esterModifier', '酯基纤维表面改性剂含量', 'Ester-based fiber surface modifier', '仅适用于芳纶：按重量计；0.25% 或更多涉及 1C210.a 的排除。', 'Aramid only: percent by weight. At least 0.25% triggers the exclusion specified in 1C210.a.', '%', when('fiberType', 'aramid'), { max: 100 }),
      text('prepregDetails', '基材、树脂类型及形态 / 带宽是什么？', 'What are the base fiber, resin, form, and tape width?', '1C210.c 涉及受 a / b 管制的碳或玻璃纤维、热固性树脂及连续线 / 纱 / 带；带宽也需核实。', '1C210.c involves carbon or glass fiber controlled by a/b, thermoset resin, and continuous yarn/roving/tow/tape forms. Verify tape width where relevant.', when('fiberType', 'prepreg')),
      ...(us ? [select('prior1C010', '是否已按 1C010.a / .b / .e 先行审查？', 'Has the material first been reviewed under 1C010.a / .b / .e?', '美国 1C210 明确排除先受这些 1C010 分项管制的材料；本问答不自动完成该先行审查。', 'U.S. 1C210 excludes material already controlled under these 1C010 subentries. This questionnaire does not perform that prior review.', opts([['not_controlled', '已有资料确认不属于这些分项', 'Documented as outside those subentries'], ['controlled', '已有资料确认属于这些分项', 'Documented as controlled by those subentries'], ['pending', '尚未完成先行审查', 'Prior review not completed']]))] : [])
    ];
    definitions[2].questions[regime] = [
      select('machineType', '有哪些加工功能？', 'What machining functions does it have?', '具有多种功能的机床，需要分别核对相应分项。', 'A multifunction machine must be checked against each applicable functional subentry.', opts([['milling', '仅铣削', 'Milling only'], ['turning', '仅车削', 'Turning only'], ['grinding', '仅磨削', 'Grinding only'], ['edm', '电火花加工', 'Electrical discharge machining'], ['multi', '多功能 / 其他加工', 'Multifunction / other machining']])),
      select('materialScope', '是否用于切削金属、陶瓷或复合材料？', 'Is it for removing or cutting metals, ceramics, or composites?', '这是 2B201 的上位范围条件。', 'This is part of the introductory scope of 2B201.'),
      number('contourAxes', '可同时协调成形控制的轴数', 'Axes coordinated simultaneously for contouring control', '按制造商规格核实；机床总轴数不等于同时成形控制轴数。', 'Verify manufacturer specifications. Total installed axes are not the same as simultaneous contouring axes.', '', null, { integer: true }),
      number('rotaryAxes', '成形旋转轴数量', 'Number of contouring rotary axes', '另行记录旋转轴，不能把线性轴与旋转轴混为一谈。', 'Record rotary axes separately; linear and rotary axes are not interchangeable.', '', null, { integer: true }),
      select('accuracyBasis', '定位精度采用什么测量依据？', 'What measurement basis is used for positioning accuracy?', us ? '美国 2B201 使用 ISO 230/2:2006；2B001 的单向定位重复性是不同参数。' : '中国 2B201 使用 ISO 230-2:1988 或等效国家标准；不要与重复定位精度混用。', us ? 'U.S. 2B201 uses ISO 230/2:2006. Unidirectional positioning repeatability in 2B001 is a different metric.' : 'Chinese 2B201 uses ISO 230-2:1988 or an equivalent national standard. Do not substitute repeatability.', opts([['iso1988', 'ISO 230-2:1988', 'ISO 230-2:1988'], ['iso2006', 'ISO 230/2:2006', 'ISO 230/2:2006'], ['equivalent', '声称为等效标准，尚待验证', 'Claimed equivalent standard; verification pending'], ['repeatability', '只有重复定位精度', 'Repeatability only'], ['other', '其他测量依据', 'Other measurement basis']])),
      number('accuracy', '全补偿后的最佳直线轴总定位精度', 'Best linear-axis overall positioning accuracy with all compensation', '填正数，单位 µm；只用于当前铣床精度分支的有限比对。未知可留空。', 'Enter a positive value in µm. Used only for the limited milling-accuracy branch. Leave blank if unknown.', 'µm', when('machineType', 'milling'), { positive: true }),
      select('exclusionsReviewed', '是否已排查条目中的专用机床及行程 / 精度排除？', 'Have the entry’s special-purpose and travel/accuracy exclusions been checked?', us ? '包括专用零件加工排除、铣床 X 轴条件；还需先审查 2B001。' : '包括专用零件加工排除，以及铣床 X 轴行程和总定位精度的组合条件。', us ? 'Includes dedicated-part exclusions and milling X-axis conditions. Review 2B001 first as well.' : 'Includes dedicated-part exclusions and the combined X-axis travel and overall-accuracy conditions.', opts([['none', '已核实，未发现适用排除', 'Reviewed; no applicable exclusion identified'], ['possible', '可能适用某项排除', 'An exclusion may apply'], ['pending', '尚未完成核查', 'Review not completed']]))
    ];
    definitions[3].questions[regime] = [
      select('droneObject', '查询的是哪一类物项？', 'What kind of item are you checking?', '整机与发动机、载荷、通信设备分别核查。', 'Review the complete aircraft separately from engines, payloads, and communication equipment.', opts([['aircraft', '无人机 / 无人飞艇整机', 'Complete UAV / unmanned airship'], ['engine', '发动机', 'Engine'], ['payload', '载荷 / 光电或惯性设备', 'Payload / optical or inertial equipment'], ['radio', '无线电通信设备', 'Radio communication equipment'], ['conversion', '有人飞行器改装设备', 'Manned-aircraft conversion equipment']])),
      select('beyondVision', '是否设计为可在操作人员自然视距外受控飞行？', 'Is it designed for controlled flight beyond the operator’s direct natural vision?', us ? '美国 9A012.a 的“自然视距”是无辅助人眼视力（可佩戴矫正镜片）；以条目定义核实。' : '按中国 9A012.a 及技术说明核实“自然视距”，不能只凭遥控距离。', us ? 'U.S. 9A012.a defines natural vision as unaided human sight, with or without corrective lenses. Apply the entry definition.' : 'Apply Chinese 9A012.a and its technical notes; advertised remote-control range alone is insufficient.', null, when('droneObject', 'aircraft')),
      number('endurance', '最大续航时间', 'Maximum endurance', '按 ISO 2533:1975 标准大气、海平面零风条件核实；填分钟。', 'Verify ISA conditions under ISO 2533:1975, at sea level in zero wind. Enter minutes.', 'min', when('droneObject', 'aircraft')),
      ...(!us ? [select('gustCapability', '能否在至少 46.3 km/h 阵风下起飞并稳定可控飞行？', 'Can it take off and maintain stable controlled flight in gusts of at least 46.3 km/h?', '这是中国 9A012.a.1 的组合条件，与 30 至不足 60 分钟续航分支相关。', 'This is a combined criterion in Chinese 9A012.a.1, relevant to the 30-to-under-60-minute endurance branch.', null, when('droneObject', 'aircraft'))] : [select('spraySystem', '是否装有或设计可安装容量超过 20 L 的气溶胶喷洒系统？', 'Does it incorporate, or is it designed for, an aerosol dispensing system exceeding 20 L?', '用于提示另行核查美国 9A120 的飞行能力、喷洒系统和模型飞机说明。', 'Prompts separate review of U.S. 9A120 flight capability, dispensing-system criteria, and the model-aircraft note.', null, when('droneObject', 'aircraft'))]),
      text('payloadDetails', '关键载荷 / 部件及型号是什么？', 'What are the key payloads / components and model numbers?', us ? '例如红外成像、雷达、激光或惯性测量装置；美国 9A012.a.3–a.5 引用其他 ECCN。' : '中国 9A012 对发动机、载荷和无线电设备另设参数；请提供规格及配套机型。', us ? 'For example, infrared imaging, radar, laser, or inertial equipment. U.S. 9A012.a.3–a.5 references other ECCNs.' : 'Chinese 9A012 separately specifies engines, payloads, and radios; provide specifications and the host aircraft.'),
      select('military', '是否为军用设计 / 改装，或存在军事用途线索？', 'Is it designed/modified for military use, or are there military-use indicators?', us ? '军用无人机还需审查 9A610 / USML 管辖及最终用途限制；本模块不完成该判断。' : '军品、最终用途及临时管制需要独立审查；不能仅凭“民用”产品名称排除。', us ? 'Military UAVs require separate 9A610 / USML jurisdiction and end-use review, which this module does not perform.' : 'Military-item, end-use, and temporary controls require separate review; a “civil” product name is not conclusive.')
    ];
    definitions[4].questions[regime] = [
      select('laserType', '激光介质 / 类型是什么？', 'What is the laser medium / type?', us ? '美国 6A005、6A205、6A995 的覆盖与优先关系需要先区分。' : '中国 6A205 按激光介质和输出方式区分；类别名称本身不构成归类。', us ? 'Distinguish the scope and priority of U.S. 6A005, 6A205, and 6A995.' : 'Chinese 6A205 distinguishes laser media and output characteristics; a type name alone does not classify the item.', opts([['copper', '铜蒸气', 'Copper vapor'], ['argon', '氩离子', 'Argon ion'], ['nd', '掺钕（非玻璃）', 'Neodymium-doped (other than glass)'], ['co2', '二氧化碳', 'Carbon dioxide'], ['semiconductor', '半导体', 'Semiconductor'], ['fiber', '光纤', 'Fiber'], ['other', '其他', 'Other']])),
      select('laserMode', '输出是连续波还是脉冲？', 'Is the output continuous-wave or pulsed?', '连续波与脉冲分支可能使用不同参数。', 'Continuous-wave and pulsed branches may use different parameters.', opts([['cw', '连续波', 'Continuous-wave'], ['pulsed', '脉冲', 'Pulsed'], ['both', '两者均可', 'Both']])),
      number('wavelength', '输出波长', 'Output wavelength', '以 nm 输入。例如 1.064 µm 应先准确换算为 1064 nm；不要将其他单位直接填入。', 'Enter nm. For example, accurately convert 1.064 µm to 1064 nm first; do not enter another unit directly.', 'nm', null, { positive: true }),
      number('averagePower', '平均输出功率 / 连续波输出功率', 'Average / continuous-wave output power', '与峰值功率不同；以光学输出规格为准。', 'This is different from peak power; use the optical output specification.', 'W'),
      number('pulseWidth', '脉冲宽度', 'Pulse duration', '以 ns 输入；不知道可留空。本模块暂不自动计算激光归类。', 'Enter ns; leave blank if unknown. This module does not automatically classify lasers.', 'ns', when('laserMode', 'pulsed', 'both'), { positive: true }),
      number('repetition', '脉冲重复率', 'Pulse repetition rate', '以 Hz 输入；1 kHz = 1000 Hz。', 'Enter Hz; 1 kHz = 1000 Hz.', 'Hz', when('laserMode', 'pulsed', 'both')),
      select('transverse', '输出横模是什么？', 'What is the transverse mode?', '部分掺钕及其他激光器的阈值区分单横模与多横模。', 'Some neodymium-doped and other laser thresholds distinguish single and multiple transverse modes.', opts([['single', '单横模', 'Single transverse mode'], ['multiple', '多横模', 'Multiple transverse modes'], ['na', '资料标明不适用', 'Documented as not applicable']]))
    ];
    definitions[5].questions[regime] = [
      text('cas', '物质 CAS 号码', 'Substance CAS number', '例如 7664-39-3。CAS 命中可能对应多个条目，仍需核对物质身份和范围。', 'For example, 7664-39-3. A CAS number can appear in multiple entries; verify identity and scope.'),
      select('chemicalForm', '是单一物质还是混合物？', 'Is it a single substance or a mixture?', '混合物应取得完整成分信息和质量百分比。', 'For mixtures, obtain complete composition and weight percentages.', opts([['single', '单一物质', 'Single substance'], ['mixture', '混合物 / 溶液', 'Mixture / solution'], ['article', '含化学品的制品', 'Article containing a chemical']])),
      number('weightPercent', '该物质在混合物中的质量百分比', 'Weight percentage of the substance in the mixture', us ? '美国 1C350 存在分组浓度及低浓度规则；需同时核对 1C355 / 1C395 等相关条目。' : '中国条目及监控化学品规则需要分别核对，不能套用美国的混合物阈值。', us ? 'U.S. 1C350 has group-specific concentration provisions; also review related entries such as 1C355 / 1C395.' : 'Review the applicable Chinese entry and monitored-chemical rules separately; do not import U.S. mixture thresholds.', '%', when('chemicalForm', 'mixture'), { max: 100 }),
      text('chemicalName', '规格书 / SDS 中的物质名称', 'Substance name in the specification / SDS', '同时提供盐、异构体、水合物或其他形态信息；CAS 校验通过也不证明物质身份。', 'Include salt, isomer, hydrate, or other form information. A valid CAS checksum does not establish substance identity.'),
      select('compositionVerified', '成分和含量是否已有供应商资料支持？', 'Are composition and concentration supported by supplier documentation?', '可使用 SDS、分析证书和规格书交叉核对；文件辅助可在本机提取内容，不会上传文件。', 'Cross-check SDSs, certificates of analysis, and specifications. File assistance can extract content locally without uploading the file.')
    ];
  }

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function getScenario(id, regime) {
    if (!['CN', 'US'].includes(regime)) return null;
    const d = definitions.find(s => s.id === id);
    if (!d) return null;
    return clone({ ...d, regimes: ['CN', 'US'], regime, questions: d.questions[regime], source: { url: sourceURLs[regime], snapshot: regime === 'US' ? '2026-10-15' : null } });
  }
  const scenarios = definitions.map(d => getScenario(d.id, 'CN'));
  function detectScenario(query, regime) {
    if (!['CN', 'US'].includes(regime) || typeof query !== 'string') return null;
    const q = query.normalize('NFKC').toLowerCase();
    let best = null;
    let score = 0;
    for (const d of definitions) {
      let n = d.keywords.reduce((sum, k) => sum + (q.includes(k) ? Math.min(k.length, 12) : 0), 0);
      if (d.id === 'chemicals' && /\b\d{2,7}-\d{2}-\d\b/.test(q)) n += 20;
      if (n > score) { best = d; score = n; }
    }
    return best ? getScenario(best.id, regime) : null;
  }
  function visible(q, answers) {
    return !q.showWhen || q.showWhen.values.includes(answers[q.showWhen.id]);
  }
  function parseNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value !== 'string' || !value.trim()) return null;
    const s = value.trim();
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(s)) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  function answerValid(q, value) {
    if (value == null || value === '' || value === 'unknown') return false;
    if (q.type === 'select') return q.options.some(o => o.value === value && value !== 'unknown');
    if (q.type === 'number') {
      const n = parseNumber(value);
      return n !== null && n >= (q.min || 0) && (!q.positive || n > 0) && (q.max == null || n <= q.max) && (!q.integer || Number.isInteger(n));
    }
    return typeof value === 'string' && value.trim().length > 0;
  }
  function validCAS(value) {
    if (typeof value !== 'string') return false;
    const m = value.trim().match(/^(\d{2,7})-(\d{2})-(\d)$/);
    if (!m) return false;
    const digits = (m[1] + m[2]).split('').reverse();
    return digits.reduce((sum, d, i) => sum + Number(d) * (i + 1), 0) % 10 === Number(m[3]);
  }
  /** Optional dimensional conversion only. Explicit input units are part of the API.
   * Source definitions: CN terms T02/T03 and US 1C210 Related Definitions.
   * Standard gravity is an explicit conversion assumption, not a legal finding.
   */
  function calculateSpecificFiber(input) {
    input = input && typeof input === 'object' ? input : {};
    const density = parseNumber(input.densityGcm3);
    const modulus = parseNumber(input.modulusGPa);
    const strength = parseNumber(input.strengthMPa);
    const validDensity = density !== null && density > 0;
    const validModulus = modulus !== null && modulus > 0;
    const validStrength = strength !== null && strength > 0;
    const warnings = [];
    const supplied = v => v != null && v !== '' && !(typeof v === 'string' && (!v.trim() || v === 'unknown'));
    if (!validDensity) warnings.push(L('请输入大于零的纤维材料质量密度，单位 g/cm³；密度未知时不计算，不将其当作零。', 'Enter a positive fiber-material mass density in g/cm³. Unknown density is not treated as zero and prevents calculation.'));
    if (supplied(input.modulusGPa) && !validModulus) warnings.push(L('杨氏模量必须是大于零的有限数值，单位 GPa；不识别或猜测输入中的其他单位。', 'Young’s modulus must be a finite positive number in GPa. Other units are not interpreted or guessed.'));
    if (supplied(input.strengthMPa) && !validStrength) warnings.push(L('极限抗拉强度必须是大于零的有限数值，单位 MPa；不识别或猜测输入中的其他单位。', 'Ultimate tensile strength must be a finite positive number in MPa. Other units are not interpreted or guessed.'));
    if (!validModulus && !validStrength) warnings.push(L('至少提供杨氏模量或极限抗拉强度中的一项；另一项可以留空，保持未知。', 'Provide at least Young’s modulus or ultimate tensile strength. The other value may remain blank and unknown.'));
    const convert = (value, valid, multiplier) => {
      if (!validDensity || !valid) return null;
      // GPa / (g·cm⁻³ × g₀) × 10⁶; MPa / (g·cm⁻³ × g₀) × 10³.
      const result = (value / density) * multiplier / 9.80665;
      if (!Number.isFinite(result) || result <= 0) {
        warnings.push(L('输入数值超出可靠计算范围；请核对数值及单位。', 'The inputs exceed the reliable calculation range. Verify the values and units.'));
        return null;
      }
      return result; // Never round across a threshold before transferring a value.
    };
    return {
      specificModulus: convert(modulus, validModulus, 1e6),
      specificStrength: convert(strength, validStrength, 1e3),
      explanation: L(
        '换算假设标准重力 g₀ = 9.80665 m/s²：比模量(m) = 杨氏模量(GPa) × 10⁶ ÷ [密度(g/cm³) × g₀]；比抗拉强度(m) = 极限抗拉强度(MPa) × 10³ ÷ [密度(g/cm³) × g₀]。请确认是同一纤维材料的参数，非成品复合材料密度；原定义要求 23±2°C、相对湿度 50±5%。计算不会自动确认测量依据，也不作归类结论。',
        'Assuming standard gravity g₀ = 9.80665 m/s²: specific modulus (m) = Young’s modulus (GPa) × 10⁶ ÷ [density (g/cm³) × g₀]; specific tensile strength (m) = ultimate tensile strength (MPa) × 10³ ÷ [density (g/cm³) × g₀]. Use properties of the same fiber material, not the density of a finished composite. The source definitions require 23±2°C and 50±5% relative humidity. Calculation does not confirm the measurement basis or determine classification.'
      ),
      warnings
    };
  }
  const check = (labelZh, labelEn, state, detailZh, detailEn) => ({ label: L(labelZh, labelEn), state, detail: L(detailZh, detailEn) });

  function evaluate(scenarioId, answers, regime) {
    answers = answers && typeof answers === 'object' ? answers : {};
    const s = getScenario(scenarioId, regime);
    if (!s) return { status: 'needs_review', title: L('请选择有效的制度与场景', 'Select a valid regime and scenario'), notes: [scopeNote], missing: [], suggestedCodes: [], checks: [] };
    const visibleQuestions = s.questions.filter(q => visible(q, answers));
    let missing = visibleQuestions.filter(q => !answerValid(q, answers[q.id])).map(q => q.id);
    const checks = [];
    const notes = [scopeNote];
    let codes = s.candidateCodes[regime].slice();
    const us = regime === 'US';
    let status = 'needs_review';

    if (scenarioId === 'carbon-fiber') {
      const type = answers.fiberType;
      const mod = parseNumber(answers.specificModulus);
      const strength = parseNumber(answers.specificStrength);
      const supported = ['carbon', 'aramid', 'glass'].includes(type);
      if (supported && answers.specificBasis === 'yes') {
        const glass = type === 'glass';
        const modLimit = glass ? 3180000 : 12700000;
        const strengthLimit = glass ? 76200 : 235000;
        const validMod = mod !== null && mod >= 0;
        const validStrength = strength !== null && strength >= 0;
        const modMet = validMod && mod >= modLimit;
        const strengthMet = validStrength && strength >= strengthLimit;
        const branch = glass ? '1C210.b' : '1C210.a';
        const pairMet = glass ? modMet && strengthMet : modMet || strengthMet;
        const pairNotMet = glass ? (validMod && !modMet) || (validStrength && !strengthMet) : validMod && validStrength && !modMet && !strengthMet;
        if (!glass && pairMet) missing = missing.filter(id => !['specificModulus', 'specificStrength'].includes(id));
        if (glass && pairNotMet) missing = missing.filter(id => !['specificModulus', 'specificStrength'].includes(id));
        checks.push(check(`${branch}：比模量 ≥ ${modLimit.toLocaleString('en-US')} m`, `${branch}: specific modulus ≥ ${modLimit.toLocaleString('en-US')} m`, validMod ? modMet ? 'met' : 'not_met' : 'unknown', '仅核对这一技术参数；仍需结合材料类型、术语和完整条目。', 'This checks one technical parameter only; material type, definitions, and the complete entry remain relevant.'));
        checks.push(check(`${branch}：比抗拉强度 ≥ ${strengthLimit.toLocaleString('en-US')} m`, `${branch}: specific tensile strength ≥ ${strengthLimit.toLocaleString('en-US')} m`, validStrength ? strengthMet ? 'met' : 'not_met' : 'unknown', glass ? '玻璃纤维需要同时满足两项参数。' : '碳 / 芳纶材料的这两项参数使用“或”。', glass ? 'Glass fiber requires both parameter criteria.' : 'These two parameter criteria use OR for carbon/aramid.'));
        checks.push(check(`${branch} 参数组合`, `${branch} parameter combination`, pairMet ? 'met' : pairNotMet ? 'not_met' : 'unknown', pairMet ? '已达到所列参数组合；尚不能据此完成归类。' : pairNotMet ? '未达到本参数组合；不能据此排除其他条目。' : '尚无足够有效参数完成组合核对。', pairMet ? 'The listed parameter combination is met; this does not complete classification.' : pairNotMet ? 'This parameter combination is not met; other entries are not ruled out.' : 'Insufficient valid data to evaluate this combination.'));
        if (pairMet) status = 'candidate_match';
        if (pairNotMet) status = 'limited_check_not_met';
        if (type === 'aramid') {
          const ester = parseNumber(answers.esterModifier);
          const esterKnown = ester !== null && ester >= 0 && ester <= 100;
          checks.push(check('芳纶表面改性剂排除', 'Aramid surface-modifier exclusion', !esterKnown ? 'unknown' : ester >= 0.25 ? 'review' : 'not_met', '酯基表面改性剂达到 0.25%（重量）涉及 1C210.a 排除；应核实成分及比例。', 'An ester-based surface modifier of at least 0.25% by weight invokes the 1C210.a exclusion; verify composition and percentage.'));
          if (esterKnown && ester >= 0.25) status = 'needs_review';
        }
      } else {
        checks.push(check('材料形态与参数定义', 'Material form and parameter definitions', 'review', '先确认是条目定义的纤维 / 纤丝材料，并取得以米为单位的比值参数。预浸料和成型结构需要独立核查。', 'First confirm the entry-defined fibrous/filamentary form and obtain specific-property values in meters. Prepregs and finished structures require separate review.'));
      }
      if (us) {
        checks.push(check('1C010 优先审查', 'Prior 1C010 review', answers.prior1C010 === 'not_controlled' ? 'met' : answers.prior1C010 === 'controlled' ? 'review' : 'unknown', '美国 1C210 仅涵盖未先被 1C010.a / .b / .e 管制的相应材料。', 'U.S. 1C210 applies to the relevant materials only when not already controlled by 1C010.a / .b / .e.'));
        if (answers.prior1C010 !== 'not_controlled') {
          if (answers.prior1C010 === 'pending' && !missing.includes('prior1C010')) missing.push('prior1C010');
          if (status === 'candidate_match') status = 'needs_review';
        }
      }
      notes.push(L('数据来源：所选制度的 1C210 全文及其相关条目。参数单位不作推断；如使用换算助手，仍须自行确认材料、测量条件和依据。', 'Source: the selected regime’s complete 1C210 entry and related entries. Parameter units are not inferred. If using the conversion helper, independently confirm the material, measurement conditions, and basis.'));
    }

    if (scenarioId === 'machine-tools') {
      const basis = us ? 'iso2006' : 'iso1988';
      const value = parseNumber(answers.accuracy);
      const valueKnown = value !== null && value > 0;
      if (answers.machineType === 'milling' && answers.accuracyBasis === basis && valueKnown) {
        const thresholdMet = us ? value <= 4.5 : value < 6;
        checks.push(check(us ? '2B201.b.1：总定位精度 ≤ 4.5 µm' : '2B201.b.1：总定位精度 < 6 µm', us ? '2B201.b.1: overall positioning accuracy ≤ 4.5 µm' : '2B201.b.1: overall positioning accuracy < 6 µm', thresholdMet ? 'met' : 'not_met', us ? '仅对 ISO 230/2:2006、全补偿定位精度核对这一分项；还需先审查 2B001。' : '仅对 ISO 230-2:1988、全补偿定位精度核对这一分项。', us ? 'Checks this subcriterion using ISO 230/2:2006 with all compensation. Prior 2B001 review remains necessary.' : 'Checks this subcriterion using ISO 230-2:1988 with all compensation.'));
        status = thresholdMet ? 'candidate_match' : 'limited_check_not_met';
      } else {
        checks.push(check('定位精度分支', 'Positioning-accuracy branch', 'review', '只有确认铣削功能、正确标准版本和有效精度值后，才进行这一有限数值比对。不同标准和重复定位精度不自动互换。', 'This limited numerical check requires milling-only functionality, the correct standard edition, and a valid accuracy value. Standards and repeatability metrics are not automatically interchanged.'));
      }
      const axes = parseNumber(answers.contourAxes);
      const rotary = parseNumber(answers.rotaryAxes);
      if (axes !== null && Number.isInteger(axes) && axes >= 5 || rotary !== null && Number.isInteger(rotary) && rotary >= 2) {
        checks.push(check('其他轴数分支', 'Other axis-count branches', 'review', '已报告至少 5 个同时成形轴或至少 2 个成形旋转轴，请另行核对相应机床功能分项；精度分支不满足仍可能存在其他候选。', 'At least 5 simultaneous contouring axes or 2 contouring rotary axes were reported. Review the applicable functional branches; failure of the accuracy branch does not rule these out.'));
        if (status === 'limited_check_not_met') status = 'needs_review';
      }
      checks.push(check('上位条件及排除', 'Introductory conditions and exclusions', answers.materialScope === 'yes' && axes !== null && Number.isInteger(axes) && axes >= 2 && answers.exclusionsReviewed === 'none' ? 'review' : 'unknown', '必须核实材料范围、同时成形能力、专用机床排除及 X 轴行程 / 精度组合排除。本模块不自动认定排除成立。', 'Verify material scope, simultaneous contouring, dedicated-machine exclusions, and combined X-axis travel/accuracy exclusions. This module does not automatically determine an exclusion.'));
      if (answers.exclusionsReviewed === 'possible' || answers.materialScope !== 'yes' || axes === null || axes < 2) {
        if (status === 'candidate_match') status = 'needs_review';
      }
      if (answers.exclusionsReviewed === 'pending' && !missing.includes('exclusionsReviewed')) missing.push('exclusionsReviewed');
      notes.push(L(us ? '来源：美国 2B001、2B201 的上位描述、b.1 及说明。中国 6 µm 的阈值不得移植至美国。' : '来源：中国 2B201 上位描述、b.1 及说明。等于 6 µm 不满足 b.1 的“小于”，但其他分项仍须核查。', us ? 'Sources: U.S. 2B001 and 2B201, including its introductory scope, b.1, and notes. Do not import the Chinese 6 µm threshold.' : 'Source: Chinese 2B201 introductory scope, b.1, and notes. Exactly 6 µm does not satisfy b.1’s strict less-than test; other branches still require review.'));
    }

    if (scenarioId === 'encryption') {
      if (us) {
        checks.push(check('5A002.a 的功能与算法范围', '5A002.a functional and algorithm scope', 'review', '需结合主要功能、数据机密性、算法与可启用性核对；有加密或 Wi-Fi 都不能直接决定归类。', 'Review primary function, data confidentiality, algorithm, and activation capability. Encryption or Wi-Fi alone cannot determine classification.'));
        if (answers.usPrimary === 'civil') checks.push(check('联网民用应用注释 2.j', 'Connected civil application Note 2.j', 'review', '已进入该注释的核查路径。还需完整确认设备范围、用途限制、公开 / 商用标准及用户更改能力，不能据本问答自动认定排除。', 'This selects the Note 2.j review path. Confirm its full equipment scope, application limits, standards, and user-modification criteria; no exclusion is automatically established.'));
        checks.push(check('大众市场 / 许可程序', 'Mass-market / licensing procedures', 'review', '如评估 5A992.c 或 5D992.c，还需核实密码说明及适用程序；本工具不作 ENC、NLR 或 EAR99 结论。', 'For 5A992.c or 5D992.c, verify the Cryptography Note and applicable procedures. This tool does not issue ENC, NLR, or EAR99 conclusions.'));
        if (answers.object === 'software') codes = ['5D002', '5D992'];
        notes.push(L('来源：美国 5A002.a、技术说明、注释 2.j，以及 5A992 / 5D002 / 5D992；同一终端和其模块可能需要分别分析。', 'Sources: U.S. 5A002.a, technical notes, Note 2.j, and 5A992 / 5D002 / 5D992. A host device and its module may require separate analysis.'));
      } else {
        const path = { chip: '5A002.a', crypto: '5A002.b', vpn: '5A002.c', key: '5A002.d', sector: '5A002.e', quantum: '5A002.f', analysis: '5A004' }[answers.cnFunction];
        checks.push(check(path ? `${path} 条件核查路径` : '中国密码物项核查路径', path ? `${path} criteria review path` : 'Chinese cryptographic-item review path', 'review', path ? '已按产品功能定位到候选分项。算法长度、用途和速率 / 管理对象等组合条件仍需阅读完整条目核实。' : '普通附带通信加密不直接等同于中国 5A002；先确认产品实质功能及专用用途。', path ? 'The reported function points to a candidate subentry. Verify the complete combination of algorithm, application, throughput, or managed-object criteria.' : 'Incidental communication encryption is not automatically Chinese 5A002; establish the actual function and dedicated applications.'));
        if (answers.cnFunction === 'analysis') codes = ['5A004'];
        else if (answers.object === 'software') codes = ['5D002'];
        else codes = ['5A002'];
        notes.push(L('来源：中国 5A002.a–f、5A004 与 5D002。中国条件与美国加密规则分别维护，不按 ECCN 同号移植。', 'Sources: Chinese 5A002.a–f, 5A004, and 5D002. Chinese criteria are maintained separately from U.S. encryption rules; identical codes do not establish equivalence.'));
      }
    }

    if (scenarioId === 'drones') {
      const duration = parseNumber(answers.endurance);
      if (answers.droneObject === 'aircraft') {
        if (!us && duration !== null && duration >= 0) {
          checks.push(check('中国 9A012.a 续航组合', 'Chinese 9A012.a endurance combination', 'review', duration >= 60 ? '已报告至少 60 分钟续航：请重点核对 a.2 及自然视距外可控飞行条件。仍需验证规定测量条件。' : duration >= 30 ? '已报告 30 至不足 60 分钟续航：还需核实 a.1 的阵风下起飞、稳定受控飞行条件。' : '已报告不足 30 分钟续航；仍需独立检查 9A501、载荷、部件及用途规则。', duration >= 60 ? 'Reported endurance is at least 60 minutes: focus on a.2 and controlled flight beyond natural vision. Verify the prescribed measurement conditions.' : duration >= 30 ? 'Reported endurance is 30 to under 60 minutes: also verify the a.1 gust takeoff and stable controlled-flight criteria.' : 'Reported endurance is under 30 minutes; separately review 9A501, payloads, components, and end-use rules.'));
        }
        if (us) checks.push(check('美国 9A012.a 的独立结构', 'Independent U.S. 9A012.a structure', 'review', '资料快照将续航分为不足 3 小时和至少 3 小时，并保留上位自然视距外受控飞行条件及载荷分项。不得套用中国 30 / 60 分钟和阵风条件。', 'The source snapshot separates endurance below 3 hours and at least 3 hours, with the introductory beyond-natural-vision condition and payload branches. Do not substitute China’s 30/60-minute and gust criteria.'));
      }
      if (us && answers.spraySystem === 'yes') notes.push(L('喷洒系统信息提示进一步核查 9A120；其完整组合条件及相关说明仍需审查。', 'The dispensing-system response calls for 9A120 review; its complete combined criteria and notes remain to be checked.'));
      if (answers.military === 'yes') notes.push(L('已记录军用相关线索，请另行开展军品管辖及最终用途核查。', 'Military-related indicators were reported; perform separate military-item jurisdiction and end-use reviews.'));
      notes.push(L(us ? '来源：美国 9A012、9A120 及相关管辖提示；使用 2026-10-15 快照。' : '来源：中国 9A012、9A501 全文。模型飞机说明、临时管制和最终用途限制仍需独立核实。', us ? 'Sources: U.S. 9A012, 9A120, and related jurisdiction notes, using the October 15, 2026 snapshot.' : 'Sources: Chinese 9A012 and 9A501. Separately verify model-aircraft notes, temporary controls, and end-use restrictions.'));
    }

    if (scenarioId === 'lasers') {
      checks.push(check('激光技术参数组合', 'Combined laser specifications', 'review', '已整理介质、波长、模式及功率等字段。还可能需要峰值功率、脉冲能量、可调谐性、Q 开关或转换效率；本版不自动作激光归类。', 'The form collects medium, wavelength, mode, and power. Peak power, pulse energy, tunability, Q-switching, or efficiency may also be needed. This version does not automatically classify lasers.'));
      notes.push(L(us ? '来源：美国 6A005、6A205、6A995；6A205 明确要求先排查 6A005，并保留核管理权限例外。' : '来源：中国 6A205 及其说明。各子项必须按完整参数组合核对，不能只凭功率判定。', us ? 'Sources: U.S. 6A005, 6A205, and 6A995. 6A205 requires prior 6A005 review and retains the nuclear licensing-jurisdiction exclusion.' : 'Source: Chinese 6A205 and its notes. Review each full parameter combination; power alone is insufficient.'));
    }

    if (scenarioId === 'chemicals') {
      const casOK = validCAS(answers.cas);
      checks.push(check('CAS 格式与校验位', 'CAS format and checksum', casOK ? 'met' : answers.cas ? 'not_met' : 'unknown', casOK ? '格式和校验位通过；这只验证标识格式，不证明物质身份或管制状态。请用该号码检索全部相关条目。' : '请核实 CAS 号码格式及最后一位校验位，不自动更改或猜测编号。', casOK ? 'Format and checksum are valid. This verifies the identifier format only, not substance identity or control status. Search all entries containing this number.' : 'Verify the CAS format and final check digit. The identifier is not automatically corrected or guessed.'));
      if (!casOK && !missing.includes('cas')) missing.push('cas');
      checks.push(check('物质身份及混合物规则', 'Substance identity and mixture rules', 'review', us ? '需按实际 CAS 命中重新定位；1C350 不是所有化学品的通用规则，低浓度也可能涉及其他条目。' : '需按实际 CAS 命中重新定位；1C350 与 1C450 的物质范围及适用管理规则不同。', us ? 'Locate entries by the actual CAS match. 1C350 is not a universal chemical rule; lower concentrations can involve other entries.' : 'Locate entries by the actual CAS match. Chinese 1C350 and 1C450 cover different substances and management regimes.'));
      notes.push(L('这里列出的编号只是本场景常见检索入口，不表示输入的化学品已经命中这些条目。', 'The listed codes are common research starting points for this scenario; they do not mean that the entered chemical matches those entries.'));
    }

    if (missing.length) status = 'needs_information';
    const titles = {
      needs_information: L('还需要补充关键资料', 'Key information is still needed'),
      candidate_match: L('已达到部分候选条件，继续复核', 'Some candidate criteria are met; continue review'),
      limited_check_not_met: L('所核对的有限条件未满足', 'The limited criteria checked are not met'),
      needs_review: L('已整理核查路径，请继续复核条款', 'Review path prepared; verify the provisions')
    };
    notes.push(L(us ? '美国资料使用 2026-10-15 快照；查询日期不代表所有条款的生效日期。' : '中国资料沿用已提供工作簿的来源版本；本问答不声明已覆盖之后全部公告。', us ? 'U.S. material uses the October 15, 2026 snapshot. The research date is not the effective date of every provision.' : 'Chinese material follows the source versions in the supplied workbook. This questionnaire does not claim to cover all subsequent announcements.'));
    return { status, title: titles[status], notes, missing: Array.from(new Set(missing)), suggestedCodes: codes, checks, source: s.source };
  }
  return { scenarios, detectScenario, getScenario, evaluate, calculateSpecificFiber };
});
