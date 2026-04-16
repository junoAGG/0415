/**
 * TDD Green 阶段 - add 函数
 *
 * Spec 对齐: 13-测试策略与质量门禁.md § 3.7 / §四 Step 7
 * 模块编号: M2-CALC
 * 覆盖 TC: TC-M02-111 ~ TC-M02-117（共 7 条，预期全部 PASS）
 *
 * Green 阶段的目的：
 * 1. 编写刚好足够让测试通过的代码
 * 2. 不做过度设计，只满足测试要求
 *
 * 质量门禁 G-UNIT: 覆盖率 ≥ 80%
 * 质量门禁 G-COV:  Statements / Branches / Functions / Lines 100%
 */

function add(a, b) {
  return a + b;
}

module.exports = add;
