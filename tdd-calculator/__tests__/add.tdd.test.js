/**
 * Spec 对齐: 13-测试策略与质量门禁.md § 3.7 独立 add 函数 TDD 演示
 * 模块编号: M2-CALC
 * TC 范围: TC-M02-111 ~ TC-M02-117
 * 层级: L1 Unit
 *
 * TDD 阶段切换：
 *   Red 阶段:   require('../src/add.red')   → 7 条全部 FAIL
 *   Green 阶段: require('../src/add.green') → 7 条全部 PASS
 */

const add = require('../src/add.red');

describe('add 函数 (Spec §3.7)', () => {
  // TC-M02-111 | Unit | 两个正数相加 | add(2, 3) → 5
  test('TC-M02-111: 两个正数相加', () => {
    expect(add(2, 3)).toBe(5);
  });

  // TC-M02-112 | Unit | 正数和负数相加 | add(5, -3) → 2
  test('TC-M02-112: 正数和负数相加', () => {
    expect(add(5, -3)).toBe(2);
  });

  // TC-M02-113 | Unit | 两个负数相加 | add(-2, -3) → -5
  test('TC-M02-113: 两个负数相加', () => {
    expect(add(-2, -3)).toBe(-5);
  });

  // TC-M02-114 | Unit | 加零 | add(5, 0) → 5
  test('TC-M02-114: 加零', () => {
    expect(add(5, 0)).toBe(5);
  });

  // TC-M02-115 | Unit | 两个零相加 | add(0, 0) → 0
  test('TC-M02-115: 两个零相加', () => {
    expect(add(0, 0)).toBe(0);
  });

  // TC-M02-116 | Unit | 小数相加 | add(0.1, 0.2) ≈ 0.3
  test('TC-M02-116: 小数相加', () => {
    expect(add(0.1, 0.2)).toBeCloseTo(0.3);
  });

  // TC-M02-117 | Unit | 大数相加 | add(1000000, 2000000) → 3000000
  test('TC-M02-117: 大数相加', () => {
    expect(add(1000000, 2000000)).toBe(3000000);
  });
});
