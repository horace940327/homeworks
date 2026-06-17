export type CharacterId = "一" | "人" | "山" | "火" | "林" | "風" | "龍" | "戰" | "霸" | "鬥";

export type Point = {
  x: number;
  y: number;
};

export type Stroke = Point[];

export type CharacterDefinition = {
  id: CharacterId;
  difficulty: number;
  archetype: string;
  trait: string;
  skillName: string;
  skillEffect: string;
  statBias: {
    weight: number;
    stability: number;
    attack: number;
    defense: number;
  };
  statCap: number;
  expectedStrokeCount: number;
  template: Stroke[];
};

export type ScoreBreakdown = {
  completeness: number;
  accuracy: number;
  structure: number;
  continuity: number;
  speed: number;
  strokeOrder: number;
  total: number;
  grade: string;
  title: string;
};

export type BattleStats = {
  weight: number;
  stability: number;
  attack: number;
  defense: number;
};

export type BattleTop = {
  name: string;
  characterId: CharacterId;
  grade: string;
  score: number;
  skillName: string;
  skillEffect: string;
  stats: BattleStats;
};

export type RoundLog = {
  round: number;
  playerDamage: number;
  enemyDamage: number;
  playerSpin: number;
  enemySpin: number;
  event?: string;
};

export type BattleResult = {
  playerTop: BattleTop;
  enemyTop: BattleTop;
  logs: RoundLog[];
  winner: "player" | "enemy" | "draw";
};

export const STORAGE_KEY = "battle-top-writing-mvp";
const GRID_SIZE = 28;
const CANVAS_SIZE = 320;

function point(x: number, y: number): Point {
  return { x, y };
}

function line(fromX: number, fromY: number, toX: number, toY: number): Stroke {
  return [point(fromX, fromY), point(toX, toY)];
}

export const characters: CharacterDefinition[] = [
  {
    id: "一",
    difficulty: 1,
    archetype: "平衡型",
    trait: "穩定度小幅提升",
    skillName: "一線突擊",
    skillEffect: "直線加速撞擊",
    statBias: { weight: 0.98, stability: 1.08, attack: 0.96, defense: 1.02 },
    statCap: 70,
    expectedStrokeCount: 1,
    template: [line(20, 50, 80, 50)],
  },
  {
    id: "人",
    difficulty: 2,
    archetype: "速度型",
    trait: "攻擊頻率提升",
    skillName: "雙刃切入",
    skillEffect: "連續兩次小撞擊",
    statBias: { weight: 0.92, stability: 0.96, attack: 1.1, defense: 0.92 },
    statCap: 74,
    expectedStrokeCount: 2,
    template: [line(48, 20, 34, 80), line(50, 20, 70, 80)],
  },
  {
    id: "山",
    difficulty: 3,
    archetype: "防禦型",
    trait: "防禦提升",
    skillName: "山壁防禦",
    skillEffect: "短時間提高防禦",
    statBias: { weight: 1.02, stability: 1.02, attack: 0.9, defense: 1.12 },
    statCap: 78,
    expectedStrokeCount: 3,
    template: [line(25, 20, 25, 80), line(50, 10, 50, 80), line(75, 20, 75, 80)],
  },
  {
    id: "火",
    difficulty: 4,
    archetype: "攻擊型",
    trait: "攻擊提升",
    skillName: "烈焰衝撞",
    skillEffect: "攻擊力大幅提升",
    statBias: { weight: 0.95, stability: 0.9, attack: 1.14, defense: 0.92 },
    statCap: 82,
    expectedStrokeCount: 4,
    template: [line(50, 15, 50, 78), line(35, 35, 20, 55), line(65, 35, 80, 55), line(44, 52, 28, 84)],
  },
  {
    id: "林",
    difficulty: 5,
    archetype: "持久型",
    trait: "旋轉時間提升",
    skillName: "森林恢復",
    skillEffect: "回復部分轉速",
    statBias: { weight: 1.04, stability: 1.12, attack: 0.92, defense: 0.98 },
    statCap: 86,
    expectedStrokeCount: 8,
    template: [
      line(26, 18, 26, 82),
      line(14, 34, 38, 34),
      line(22, 50, 12, 68),
      line(28, 50, 40, 70),
      line(62, 18, 62, 82),
      line(50, 34, 74, 34),
      line(58, 50, 48, 68),
      line(64, 50, 76, 70),
    ],
  },
  {
    id: "風",
    difficulty: 6,
    archetype: "速度型",
    trait: "移動速度提升",
    skillName: "旋風閃避",
    skillEffect: "提升移動速度",
    statBias: { weight: 0.94, stability: 1.02, attack: 1.02, defense: 0.96 },
    statCap: 89,
    expectedStrokeCount: 8,
    template: [
      line(26, 14, 26, 84),
      line(26, 14, 74, 14),
      line(74, 14, 74, 56),
      line(26, 84, 70, 84),
      line(46, 26, 62, 42),
      line(40, 44, 60, 58),
      line(36, 60, 56, 72),
      line(68, 60, 82, 76),
    ],
  },
  {
    id: "龍",
    difficulty: 7,
    archetype: "全能型",
    trait: "四能力平均提升",
    skillName: "龍旋破",
    skillEffect: "全能力短暫提升",
    statBias: { weight: 1.04, stability: 1.04, attack: 1.04, defense: 1.04 },
    statCap: 95,
    expectedStrokeCount: 12,
    template: [
      line(18, 14, 18, 86),
      line(18, 14, 52, 14),
      line(18, 36, 48, 36),
      line(18, 58, 46, 58),
      line(18, 82, 52, 82),
      line(52, 14, 52, 82),
      line(60, 22, 82, 22),
      line(62, 38, 78, 38),
      line(60, 52, 82, 52),
      line(60, 68, 80, 68),
      line(72, 22, 72, 84),
      line(60, 84, 82, 84),
    ],
  },
  {
    id: "戰",
    difficulty: 8,
    archetype: "攻擊型",
    trait: "撞擊傷害提升",
    skillName: "戰意爆發",
    skillEffect: "攻擊越打越高",
    statBias: { weight: 1, stability: 0.94, attack: 1.16, defense: 0.98 },
    statCap: 97,
    expectedStrokeCount: 14,
    template: [
      line(18, 18, 18, 82),
      line(18, 18, 44, 18),
      line(18, 40, 44, 40),
      line(18, 62, 44, 62),
      line(44, 18, 44, 82),
      line(56, 18, 82, 18),
      line(56, 36, 80, 36),
      line(56, 54, 80, 54),
      line(56, 72, 80, 72),
      line(68, 18, 68, 84),
      line(54, 84, 82, 84),
      line(28, 82, 44, 94),
      line(60, 84, 44, 94),
      line(44, 94, 78, 94),
    ],
  },
  {
    id: "霸",
    difficulty: 9,
    archetype: "重量型",
    trait: "重量大幅提升",
    skillName: "霸體重壓",
    skillEffect: "不容易被擊退",
    statBias: { weight: 1.18, stability: 1, attack: 0.98, defense: 1.08 },
    statCap: 99,
    expectedStrokeCount: 16,
    template: [
      line(18, 16, 82, 16),
      line(18, 28, 82, 28),
      line(24, 40, 76, 40),
      line(24, 52, 76, 52),
      line(20, 64, 80, 64),
      line(22, 16, 22, 64),
      line(78, 16, 78, 64),
      line(32, 72, 68, 72),
      line(32, 84, 68, 84),
      line(32, 96, 68, 96),
      line(32, 72, 32, 96),
      line(68, 72, 68, 96),
      line(44, 72, 44, 96),
      line(56, 72, 56, 96),
      line(32, 108, 50, 120),
      line(50, 120, 68, 108),
    ],
  },
  {
    id: "鬥",
    difficulty: 10,
    archetype: "高風險型",
    trait: "寫得好很強，寫不好很弱",
    skillName: "鬥魂覺醒",
    skillEffect: "低血量時爆發",
    statBias: { weight: 1.08, stability: 0.98, attack: 1.18, defense: 0.96 },
    statCap: 100,
    expectedStrokeCount: 18,
    template: [
      line(18, 16, 18, 86),
      line(18, 16, 40, 16),
      line(18, 34, 40, 34),
      line(18, 52, 40, 52),
      line(18, 70, 40, 70),
      line(40, 16, 40, 86),
      line(60, 16, 60, 86),
      line(60, 16, 82, 16),
      line(60, 34, 82, 34),
      line(60, 52, 82, 52),
      line(60, 70, 82, 70),
      line(82, 16, 82, 86),
      line(28, 86, 50, 106),
      line(50, 106, 72, 86),
      line(28, 106, 72, 106),
      line(28, 118, 72, 118),
      line(50, 86, 50, 118),
      line(18, 118, 82, 118),
    ],
  },
];

export function getCharacter(id: CharacterId) {
  return characters.find((entry) => entry.id === id) ?? characters[0];
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(Math.max(value, min), max);
}

export function randomRange(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function drawReference(
  context: CanvasRenderingContext2D,
  character: CharacterDefinition,
  size = CANVAS_SIZE
) {
  context.clearRect(0, 0, size, size);
  context.save();
  context.strokeStyle = "rgba(148, 163, 184, 0.25)";
  context.lineWidth = size * 0.06;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.setLineDash([12, 8]);
  context.strokeRect(size * 0.12, size * 0.12, size * 0.76, size * 0.76);
  context.setLineDash([]);
  context.strokeStyle = "rgba(96, 165, 250, 0.35)";

  for (const stroke of character.template) {
    context.beginPath();
    stroke.forEach((node, index) => {
      const x = (node.x / 100) * size;
      const y = (node.y / 128) * size;
      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    });
    context.stroke();
  }

  context.restore();
}

function createRasterCells(character: CharacterDefinition, userStrokes?: Stroke[]) {
  const canvas = document.createElement("canvas");
  canvas.width = GRID_SIZE;
  canvas.height = GRID_SIZE;
  const context = canvas.getContext("2d");

  if (!context) {
    return new Set<number>();
  }

  context.clearRect(0, 0, GRID_SIZE, GRID_SIZE);
  context.strokeStyle = "#000";
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = 3;

  const strokes = userStrokes ?? character.template;
  for (const stroke of strokes) {
    context.beginPath();
    stroke.forEach((node, index) => {
      const x = (node.x / 100) * GRID_SIZE;
      const y = (node.y / 128) * GRID_SIZE;
      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    });
    context.stroke();
  }

  const pixels = context.getImageData(0, 0, GRID_SIZE, GRID_SIZE).data;
  const cells = new Set<number>();

  for (let index = 0; index < GRID_SIZE * GRID_SIZE; index += 1) {
    if (pixels[index * 4 + 3] > 0) {
      cells.add(index);
    }
  }

  return cells;
}

function getBounds(strokes: Stroke[]) {
  const points = strokes.flat();
  if (points.length === 0) {
    return null;
  }

  const xs = points.map((node) => node.x);
  const ys = points.map((node) => node.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    width: Math.max(maxX - minX, 1),
    height: Math.max(maxY - minY, 1),
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

export function getGradeAndTitle(total: number, characterId: CharacterId) {
  if (total >= 95) {
    return { grade: "SSS", title: `${characterId}魂覺醒戰陀` };
  }
  if (total >= 90) {
    return { grade: "SS", title: `${characterId}極意戰陀` };
  }
  if (total >= 80) {
    return { grade: "A", title: `青${characterId}戰陀` };
  }
  if (total >= 70) {
    return { grade: "B", title: `${characterId}鋒戰陀` };
  }
  if (total >= 60) {
    return { grade: "C", title: `${characterId}影戰陀` };
  }
  return { grade: "D", title: `${characterId}練習戰陀` };
}

export function scoreHandwriting(
  character: CharacterDefinition,
  userStrokes: Stroke[],
  durationMs: number
): ScoreBreakdown {
  if (userStrokes.length === 0 || userStrokes.every((stroke) => stroke.length < 2)) {
    return {
      completeness: 0,
      accuracy: 0,
      structure: 0,
      continuity: 0,
      speed: 0,
      strokeOrder: 0,
      total: 0,
      grade: "D",
      title: "未成形戰陀",
    };
  }

  const templateCells = createRasterCells(character);
  const userCells = createRasterCells(character, userStrokes);
  const overlap = [...templateCells].filter((cell) => userCells.has(cell)).length;

  const completeness = clamp((overlap / Math.max(templateCells.size, 1)) * 100);
  const accuracy = clamp((overlap / Math.max(userCells.size, 1)) * 100);

  const templateBounds = getBounds(character.template);
  const userBounds = getBounds(userStrokes);
  let structure = 0;

  if (templateBounds && userBounds) {
    const widthRatio = userBounds.width / templateBounds.width;
    const heightRatio = userBounds.height / templateBounds.height;
    const centerOffset =
      Math.abs(userBounds.centerX - templateBounds.centerX) +
      Math.abs(userBounds.centerY - templateBounds.centerY);

    structure = clamp(
      100 -
        Math.abs(1 - widthRatio) * 48 -
        Math.abs(1 - heightRatio) * 48 -
        centerOffset * 0.52
    );
  }

  const continuity = clamp(
    100 -
      Math.abs(userStrokes.length - character.expectedStrokeCount) * 11 -
      userStrokes.filter((stroke) => stroke.length < 3).length * 8
  );

  const seconds = durationMs / 1000;
  const idealSeconds = 8 + character.difficulty * 0.8;
  const speed = clamp(100 - Math.abs(seconds - idealSeconds) * 7);

  const expectedStarts = character.template.map((stroke) => stroke[0]);
  const actualStarts = userStrokes.map((stroke) => stroke[0]).slice(0, expectedStarts.length);
  const orderPenalty = expectedStarts.reduce((sum, startPoint, index) => {
    const actualPoint = actualStarts[index];
    if (!actualPoint) {
      return sum + 18;
    }

    return sum + (Math.abs(actualPoint.x - startPoint.x) + Math.abs(actualPoint.y - startPoint.y)) * 0.3;
  }, 0);
  const strokeOrder = clamp(100 - orderPenalty);

  const total = clamp(
    completeness * 0.4 +
      accuracy * 0.3 +
      structure * 0.2 +
      speed * 0.1 +
      (character.difficulty >= 7 ? strokeOrder * 0.05 : 0)
  );

  const gradeInfo = getGradeAndTitle(total, character.id);

  return {
    completeness: Math.round(completeness),
    accuracy: Math.round(accuracy),
    structure: Math.round(structure),
    continuity: Math.round(continuity),
    speed: Math.round(speed),
    strokeOrder: Math.round(strokeOrder),
    total: Math.round(total),
    grade: gradeInfo.grade,
    title: gradeInfo.title,
  };
}

export function convertScoreToStats(character: CharacterDefinition, score: ScoreBreakdown): BattleStats {
  const base = Math.min(score.total + character.difficulty * 2.6, character.statCap);
  const continuityBonus = (score.continuity - 50) * 0.22;
  const orderBonus = character.difficulty >= 7 ? (score.strokeOrder - 50) * 0.12 : 0;

  return {
    weight: Math.round(clamp(base * character.statBias.weight + continuityBonus * 0.4 + orderBonus, 15, 100)),
    stability: Math.round(clamp(base * character.statBias.stability + continuityBonus + orderBonus * 0.6, 15, 100)),
    attack: Math.round(clamp(base * character.statBias.attack + (score.accuracy - 50) * 0.25 + orderBonus, 15, 100)),
    defense: Math.round(clamp(base * character.statBias.defense + (score.structure - 50) * 0.22 + continuityBonus * 0.3, 15, 100)),
  };
}

export function createEnemyTop(playerCharacter: CharacterDefinition): BattleTop {
  const candidates = characters.filter((entry) => entry.id !== playerCharacter.id);
  const character = candidates[randomRange(0, candidates.length - 1)];
  const total = clamp(54 + character.difficulty * 3.2 + randomRange(-12, 16), 42, character.id === "鬥" ? 100 : character.statCap);
  const gradeInfo = getGradeAndTitle(total, character.id);
  const pseudoScore: ScoreBreakdown = {
    completeness: total,
    accuracy: total - 2,
    structure: total - 4,
    continuity: total - 3,
    speed: total - 6,
    strokeOrder: total - 5,
    total,
    grade: gradeInfo.grade,
    title: gradeInfo.title,
  };

  return {
    name: gradeInfo.title,
    characterId: character.id,
    grade: gradeInfo.grade,
    score: total,
    skillName: character.skillName,
    skillEffect: character.skillEffect,
    stats: convertScoreToStats(character, pseudoScore),
  };
}

export function simulateBattle(playerTop: BattleTop, enemyTop: BattleTop): BattleResult {
  let playerSpin = 100 + playerTop.stats.stability * 0.6 + playerTop.stats.weight * 0.2;
  let enemySpin = 100 + enemyTop.stats.stability * 0.6 + enemyTop.stats.weight * 0.2;
  const logs: RoundLog[] = [];

  for (let round = 1; round <= 8; round += 1) {
    const playerDamage = Math.max(
      4,
      Math.round(playerTop.stats.attack * 0.55 + playerTop.stats.weight * 0.2 - enemyTop.stats.defense * 0.28 + randomRange(-6, 8))
    );
    const enemyDamage = Math.max(
      4,
      Math.round(enemyTop.stats.attack * 0.55 + enemyTop.stats.weight * 0.2 - playerTop.stats.defense * 0.28 + randomRange(-6, 8))
    );

    playerSpin = Math.max(0, playerSpin - enemyDamage);
    enemySpin = Math.max(0, enemySpin - playerDamage);

    let event = "";
    if (round === 3 && playerTop.characterId === "火") {
      enemySpin = Math.max(0, enemySpin - 8);
      event = `${playerTop.skillName} 追加灼燒撞擊`;
    } else if (round === 4 && enemyTop.characterId === "霸") {
      playerSpin = Math.max(0, playerSpin - 7);
      event = `${enemyTop.skillName} 壓制反彈`;
    } else if (round === 5 && playerTop.characterId === "鬥" && playerSpin < 65) {
      enemySpin = Math.max(0, enemySpin - 10);
      event = `${playerTop.skillName} 低血量爆發`;
    } else if (round === 6 && enemyTop.characterId === "林") {
      enemySpin = Math.min(enemySpin + 8, 180);
      event = `${enemyTop.skillName} 恢復轉速`;
    }

    logs.push({
      round,
      playerDamage,
      enemyDamage,
      playerSpin: Math.round(playerSpin),
      enemySpin: Math.round(enemySpin),
      event,
    });

    if (playerSpin <= 0 || enemySpin <= 0) {
      break;
    }
  }

  return {
    playerTop,
    enemyTop,
    logs,
    winner: playerSpin === enemySpin ? "draw" : playerSpin > enemySpin ? "player" : "enemy",
  };
}

export function getCanvasSize() {
  return CANVAS_SIZE;
}
