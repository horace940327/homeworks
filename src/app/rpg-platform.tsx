"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Crosshair,
  Eraser,
  Play,
  Swords,
  Trophy,
  Wand2,
} from "lucide-react";
import {
  characters,
  convertScoreToStats,
  createEnemyTop,
  drawReference,
  getCanvasSize,
  getCharacter,
  scoreHandwriting,
  simulateBattle,
  STORAGE_KEY,
  type BattleResult,
  type BattleTop,
  type CharacterDefinition,
  type CharacterId,
  type Point,
  type ScoreBreakdown,
  type Stroke,
} from "./rpg-lib";

type GameState = {
  selectedId: CharacterId;
  strokes: Stroke[];
  score: ScoreBreakdown | null;
  playerTop: BattleTop | null;
  battle: BattleResult | null;
  startedAt: number | null;
  finishedAt: number | null;
};

type ArenaState = {
  playerX: number;
  playerY: number;
  enemyX: number;
  enemyY: number;
  playerRadius: number;
  enemyRadius: number;
  playerSpin: number;
  enemySpin: number;
};

type ImpactState = {
  active: boolean;
  key: number;
  event: string;
};

type BattlePhase = "idle" | "matchup" | "countdown" | "fighting" | "result";

function createDefaultGameState(): GameState {
  return {
    selectedId: "龍",
    strokes: [],
    score: null,
    playerTop: null,
    battle: null,
    startedAt: null,
    finishedAt: null,
  };
}

export function RpgPlatform() {
  const [game, setGame] = useState<GameState>(createDefaultGameState);
  const [loaded, setLoaded] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("先選一個字，再在字帖上寫出來。");
  const [arenaState, setArenaState] = useState<ArenaState | null>(null);
  const [battleIndex, setBattleIndex] = useState(0);
  const [battlePhase, setBattlePhase] = useState<BattlePhase>("idle");
  const [countdown, setCountdown] = useState(3);
  const [impactState, setImpactState] = useState<ImpactState>({
    active: false,
    key: 0,
    event: "",
  });
  const [announcerText, setAnnouncerText] = useState("等待開戰");
  const referenceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const phaseTimerRef = useRef<number | null>(null);
  const impactTimerRef = useRef<number | null>(null);
  const impactActiveRef = useRef(false);
  const battlePhaseRef = useRef<BattlePhase>("idle");
  const collisionActiveRef = useRef(false);

  const selectedCharacter = useMemo(() => getCharacter(game.selectedId), [game.selectedId]);
  const canvasSize = getCanvasSize();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<GameState>;
        setGame({
          ...createDefaultGameState(),
          ...parsed,
          battle: null,
        });
      }
    } catch {
      setStatusMessage("讀取上次資料失敗，已使用預設狀態。");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        selectedId: game.selectedId,
        strokes: game.strokes,
        score: game.score,
        playerTop: game.playerTop,
        startedAt: game.startedAt,
        finishedAt: game.finishedAt,
      })
    );
  }, [game, loaded]);

  useEffect(() => {
    const canvas = referenceCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) {
      drawReference(context, selectedCharacter, canvasSize);
    }
  }, [selectedCharacter, canvasSize]);

  useEffect(() => {
    redrawUserCanvas(game.strokes);
  }, [game.strokes]);

  useEffect(() => {
    impactActiveRef.current = impactState.active;
  }, [impactState.active]);

  useEffect(() => {
    battlePhaseRef.current = battlePhase;
  }, [battlePhase]);

  useEffect(() => {
    const battle = game.battle;

    if (!battle) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (phaseTimerRef.current) {
        window.clearTimeout(phaseTimerRef.current);
        phaseTimerRef.current = null;
      }
      if (impactTimerRef.current) {
        window.clearTimeout(impactTimerRef.current);
        impactTimerRef.current = null;
      }
      setBattlePhase("idle");
      setCountdown(3);
      setImpactState({ active: false, key: 0, event: "" });
      setAnnouncerText("等待開戰");
      collisionActiveRef.current = false;
      return;
    }

    const logs = battle.logs;
    let frame = 0;
    let currentIndex = 0;

    setBattleIndex(0);
    setCountdown(3);
    setBattlePhase("matchup");
    setStatusMessage(`對戰配對完成：${battle.playerTop.characterId} vs ${battle.enemyTop.characterId}`);
    setAnnouncerText(`${battle.playerTop.characterId} 對上 ${battle.enemyTop.characterId}`);
    collisionActiveRef.current = false;

    const animate = () => {
      const currentLog = logs[Math.min(currentIndex, logs.length - 1)];
      const orbit = Math.max(44, 98 - currentIndex * 6);
      const angle = frame * 0.045;
      const shakeX = impactActiveRef.current ? Math.sin(frame * 1.2) * 4 : 0;
      const shakeY = impactActiveRef.current ? Math.cos(frame * 0.9) * 3 : 0;
      const playerRadius = 18 + battle.playerTop.stats.weight * 0.12;
      const enemyRadius = 18 + battle.enemyTop.stats.weight * 0.12;
      const playerX = 160 + Math.cos(angle) * orbit + shakeX;
      const playerY = 160 + Math.sin(angle) * orbit * 0.82 + shakeY;
      const enemyX = 160 + Math.cos(angle + Math.PI) * orbit - shakeX;
      const enemyY = 160 + Math.sin(angle + Math.PI) * orbit * 0.82 - shakeY;
      const distance = Math.hypot(playerX - enemyX, playerY - enemyY);
      const colliding = distance <= (playerRadius + enemyRadius) * 0.92;

      if (battlePhaseRef.current === "fighting" && colliding && !collisionActiveRef.current) {
        const impactEvent = currentLog.event || "碰撞爆發";
        setImpactState((previous) => ({
          active: true,
          key: previous.key + 1,
          event: impactEvent,
        }));
        if (impactTimerRef.current) {
          window.clearTimeout(impactTimerRef.current);
        }
        impactTimerRef.current = window.setTimeout(() => {
          setImpactState((previous) => ({ ...previous, active: false }));
        }, 320);
      }

      collisionActiveRef.current = colliding;
      setArenaState({
        playerX,
        playerY,
        enemyX,
        enemyY,
        playerRadius,
        enemyRadius,
        playerSpin: currentLog.playerSpin,
        enemySpin: currentLog.enemySpin,
      });
      frame += 1;
      rafRef.current = requestAnimationFrame(animate);
    };

    animate();

    const stepLogs = () => {
      setBattleIndex((value) => {
        const nextValue = Math.min(value + 1, logs.length - 1);
        currentIndex = nextValue;
        const current = logs[nextValue];
        const eventText = current.event
          ? current.event
          : current.playerDamage > current.enemyDamage
            ? "重擊命中"
            : current.playerDamage < current.enemyDamage
              ? "對手壓制"
              : "正面碰撞";
        setStatusMessage(
          current.event
            ? `第 ${current.round} 回合：${current.event}`
            : `第 ${current.round} 回合交鋒中，雙方持續削減轉速。`
        );
        setAnnouncerText(`R${current.round}｜${eventText}`);
        return nextValue;
      });

      if (currentIndex < logs.length - 1) {
        timerRef.current = window.setTimeout(stepLogs, 950);
      } else {
        phaseTimerRef.current = window.setTimeout(() => {
          setBattlePhase("result");
          setAnnouncerText(
            battle.winner === "player"
              ? "玩家戰陀勝出"
              : battle.winner === "enemy"
                ? "敵方戰陀勝出"
                : "雙方平手"
          );
          setStatusMessage(
            battle.winner === "player"
              ? "比賽結束，玩家戰陀獲勝。"
              : battle.winner === "enemy"
                ? "比賽結束，敵方戰陀獲勝。"
                : "比賽結束，雙方平手。"
          );
        }, 900);
      }
    };

    phaseTimerRef.current = window.setTimeout(() => {
      setBattlePhase("countdown");
      setStatusMessage("戰鬥倒數開始。");
      setAnnouncerText("進入倒數");
      setCountdown(3);

      const runCountdown = (value: number) => {
        if (value <= 1) {
          setCountdown(1);
          phaseTimerRef.current = window.setTimeout(() => {
            setBattlePhase("fighting");
            setStatusMessage("Fight!");
            setAnnouncerText("Fight!");
            setCountdown(0);
            timerRef.current = window.setTimeout(stepLogs, 400);
          }, 700);
          return;
        }

        phaseTimerRef.current = window.setTimeout(() => {
          setCountdown(value - 1);
          runCountdown(value - 1);
        }, 700);
      };

      runCountdown(3);
    }, 900);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (phaseTimerRef.current) {
        window.clearTimeout(phaseTimerRef.current);
        phaseTimerRef.current = null;
      }
      if (impactTimerRef.current) {
        window.clearTimeout(impactTimerRef.current);
        impactTimerRef.current = null;
      }
      collisionActiveRef.current = false;
    };
  }, [game.battle]);

  function redrawUserCanvas(strokes: Stroke[]) {
    const canvas = drawCanvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.save();
    context.strokeStyle = "#f8fafc";
    context.lineWidth = canvas.width * 0.048;
    context.lineCap = "round";
    context.lineJoin = "round";

    for (const stroke of strokes) {
      if (stroke.length < 2) {
        continue;
      }

      context.beginPath();
      stroke.forEach((node, index) => {
        const x = (node.x / 100) * canvas.width;
        const y = (node.y / 128) * canvas.height;
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

  function getPointFromEvent(event: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 128,
    };
  }

  function startDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    const point = getPointFromEvent(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDrawing(true);
    setGame((previous) => ({
      ...previous,
      startedAt: previous.startedAt ?? Date.now(),
      finishedAt: null,
      score: null,
      playerTop: null,
      battle: null,
      strokes: [...previous.strokes, [point]],
    }));
  }

  function moveDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing) {
      return;
    }

    const point = getPointFromEvent(event);
    setGame((previous) => {
      if (previous.strokes.length === 0) {
        return previous;
      }

      const nextStrokes = [...previous.strokes];
      nextStrokes[nextStrokes.length - 1] = [...nextStrokes[nextStrokes.length - 1], point];

      return {
        ...previous,
        strokes: nextStrokes,
      };
    });
  }

  function endDrawing() {
    setIsDrawing(false);
  }

  function clearCanvas() {
    setGame((previous) => ({
      ...previous,
      strokes: [],
      score: null,
      playerTop: null,
      battle: null,
      startedAt: null,
      finishedAt: null,
    }));
    setBattlePhase("idle");
    setImpactState({ active: false, key: 0, event: "" });
    setAnnouncerText("等待開戰");
    setStatusMessage("畫布已清空。");
  }

  function switchCharacter(character: CharacterDefinition) {
    setGame((previous) => ({
      ...previous,
      selectedId: character.id,
      strokes: [],
      score: null,
      playerTop: null,
      battle: null,
      startedAt: null,
      finishedAt: null,
    }));
    setBattlePhase("idle");
    setImpactState({ active: false, key: 0, event: "" });
    setAnnouncerText("等待開戰");
    setStatusMessage(`已切換到「${character.id}」，難度 ${character.difficulty}。`);
  }

  function finishWriting() {
    const finishedAt = Date.now();
    const duration = finishedAt - (game.startedAt ?? finishedAt);
    const score = scoreHandwriting(selectedCharacter, game.strokes, duration);
    const stats = convertScoreToStats(selectedCharacter, score);
    const playerTop: BattleTop = {
      name: score.title,
      characterId: selectedCharacter.id,
      grade: score.grade,
      score: score.total,
      skillName: selectedCharacter.skillName,
      skillEffect: selectedCharacter.skillEffect,
      stats,
    };

    setGame((previous) => ({
      ...previous,
      finishedAt,
      score,
      playerTop,
      battle: null,
    }));
    setStatusMessage(`完成評分：${selectedCharacter.id}｜${score.grade}｜總分 ${score.total}`);
  }

  function startBattle() {
    if (!game.score || !game.playerTop) {
      return;
    }

    const enemyTop = createEnemyTop(selectedCharacter);
    const battle = simulateBattle(game.playerTop, enemyTop);
    setGame((previous) => ({
      ...previous,
      battle,
    }));
    setStatusMessage("自動對戰開始。");
  }

  const currentLog = game.battle?.logs[Math.min(battleIndex, Math.max((game.battle?.logs.length ?? 1) - 1, 0))];
  const revealedResult = battlePhase === "result";
  const visibleLogs = game.battle?.logs.slice(0, battlePhase === "fighting" || battlePhase === "result" ? battleIndex + 1 : 0) ?? [];
  const playerSpinMax = game.battle ? 100 + game.battle.playerTop.stats.stability * 0.6 + game.battle.playerTop.stats.weight * 0.2 : 100;
  const enemySpinMax = game.battle ? 100 + game.battle.enemyTop.stats.stability * 0.6 + game.battle.enemyTop.stats.weight * 0.2 : 100;
  const playerSpinPercent = arenaState ? Math.max(0, Math.min(100, (arenaState.playerSpin / playerSpinMax) * 100)) : 100;
  const enemySpinPercent = arenaState ? Math.max(0, Math.min(100, (arenaState.enemySpin / enemySpinMax) * 100)) : 100;
  const playerEffect = getCharacterEffect(game.playerTop?.characterId);
  const enemyEffect = getCharacterEffect(game.battle?.enemyTop.characterId);

  return (
    <main className="app-shell">
      <section className="hero-grid">
        <div className="glass-card hero-copy">
          <p className="eyebrow">字旋戰陀｜MVP</p>
          <h1>寫字養成 ＋ 陀螺對戰</h1>
          <p className="hero-text">
            核心流程固定為：選字 → 在 Canvas 寫字 → 系統評分完整度／準確度／結構／速度 →
            轉成重、穩、攻、防 → 自動進入陀螺戰鬥。
          </p>
          <div className="feature-grid">
            <article className="metric-card">
              <p className="metric-value">10</p>
              <p className="metric-title">可選戰字</p>
              <p className="metric-detail">一／人／山／火／林／風／龍／戰／霸／鬥</p>
            </article>
            <article className="metric-card">
              <p className="metric-value">6</p>
              <p className="metric-title">評分維度</p>
              <p className="metric-detail">完整度、準確度、結構、連續性、速度、筆順</p>
            </article>
            <article className="metric-card">
              <p className="metric-value">4</p>
              <p className="metric-title">戰鬥能力</p>
              <p className="metric-detail">重、穩、攻、防</p>
            </article>
            <article className="metric-card">
              <p className="metric-value">Auto</p>
              <p className="metric-title">對戰模式</p>
              <p className="metric-detail">第一版採自動戰鬥，先驗證玩法閉環</p>
            </article>
          </div>
        </div>

        <div className="glass-card message-card">
          <div className="section-head">
            <Wand2 size={18} />
            <h2>目前狀態</h2>
          </div>
          <p className="message-text">{statusMessage}</p>
          <div className="pill-row">
            <span className="pill">字越完整，陀螺越強</span>
            <span className="pill">難字上限更高</span>
            <span className="pill">高難字啟用筆順分</span>
          </div>
        </div>
      </section>

      <section className="glass-card">
        <div className="section-head">
          <BookOpen size={18} />
          <h2>選字階段</h2>
        </div>
        <div className="character-grid">
          {characters.map((character) => (
            <button
              key={character.id}
              className={`character-card ${character.id === selectedCharacter.id ? "selected" : ""}`}
              onClick={() => switchCharacter(character)}
            >
              <strong>{character.id}</strong>
              <span>難度 {character.difficulty}</span>
              <span>{character.archetype}</span>
              <small>{character.trait}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="content-grid writing-grid">
        <article className="glass-card">
          <div className="section-head">
            <Crosshair size={18} />
            <h2>寫字畫布</h2>
          </div>
          <p className="panel-text">
            選中的字是「{selectedCharacter.id}」，底圖會顯示透明字帖。可用滑鼠或觸控筆書寫。
          </p>

          <div className="canvas-stage">
            <canvas ref={referenceCanvasRef} width={canvasSize} height={canvasSize} className="reference-canvas" />
            <canvas
              ref={drawCanvasRef}
              width={canvasSize}
              height={canvasSize}
              className="draw-canvas"
              onPointerDown={startDrawing}
              onPointerMove={moveDrawing}
              onPointerUp={endDrawing}
              onPointerLeave={endDrawing}
            />
          </div>

          <div className="button-row">
            <button className="subtle-btn" onClick={clearCanvas}>
              <Eraser size={16} />
              清除
            </button>
            <button className="action-btn" onClick={finishWriting}>
              <CheckCircle2 size={16} />
              完成評分
            </button>
          </div>
        </article>

        <article className="glass-card">
          <div className="section-head">
            <Trophy size={18} />
            <h2>能力換算</h2>
          </div>
          {game.score && game.playerTop ? (
            <>
              <div className="detail-grid">
                <InfoRow label="字" value={selectedCharacter.id} />
                <InfoRow label="評價" value={`${game.score.grade}｜${game.score.title}`} />
                <InfoRow label="完整度" value={`${game.score.completeness}%`} />
                <InfoRow label="準確度" value={`${game.score.accuracy}%`} />
                <InfoRow label="結構" value={`${game.score.structure}%`} />
                <InfoRow label="連續性" value={`${game.score.continuity}%`} />
                <InfoRow label="速度" value={`${game.score.speed}%`} />
                <InfoRow label="筆順" value={`${game.score.strokeOrder}%`} />
                <InfoRow label="總分" value={`${game.score.total}`} />
              </div>

              <div className="stats-grid">
                <StatCard label="重" value={game.playerTop.stats.weight} />
                <StatCard label="穩" value={game.playerTop.stats.stability} />
                <StatCard label="攻" value={game.playerTop.stats.attack} />
                <StatCard label="防" value={game.playerTop.stats.defense} />
              </div>

              <div className="info-row">
                <span>字之技能</span>
                <strong>
                  {game.playerTop.skillName}｜{game.playerTop.skillEffect}
                </strong>
              </div>

              <button className="action-btn full-width-btn" onClick={startBattle}>
                <Play size={16} />
                進入自動對戰
              </button>
            </>
          ) : (
            <ul className="bullet-list">
              <li>完整度：主筆畫覆蓋率。</li>
              <li>準確度：玩家筆跡與模板的重疊比例。</li>
              <li>結構：字的長寬比與中心位置是否合理。</li>
              <li>連續性：是否過度斷筆。</li>
              <li>速度：太慢或太快都扣分。</li>
              <li>難度 7 以上額外啟用筆順起筆檢查。</li>
            </ul>
          )}
        </article>
      </section>

      <section className="content-grid battle-grid">
        <article className="glass-card">
          <div className="section-head">
            <Swords size={18} />
            <h2>戰鬥場</h2>
          </div>
          {game.battle ? (
            <div className="battle-hud">
              <SpinMeter
                label={game.battle.playerTop.name}
                value={arenaState?.playerSpin ?? playerSpinMax}
                percent={playerSpinPercent}
                align="left"
              />
              <div className={`announcer ${impactState.active ? "announcer-impact" : ""}`}>
                <span className="announcer-chip">{battlePhase.toUpperCase()}</span>
                <strong>{announcerText}</strong>
              </div>
              <SpinMeter
                label={revealedResult ? game.battle.enemyTop.name : "敵方戰陀"}
                value={arenaState?.enemySpin ?? enemySpinMax}
                percent={enemySpinPercent}
                align="right"
              />
            </div>
          ) : null}
          <div className="arena">
            <div className="arena-ring" />
            {impactState.active ? <div key={impactState.key} className="impact-flash" /> : null}
            {game.battle && battlePhase === "matchup" ? (
              <div className="arena-overlay">
                <p className="overlay-kicker">Match Up</p>
                <div className="versus-row">
                  <strong>{game.battle.playerTop.characterId}</strong>
                  <span>VS</span>
                  <strong>{game.battle.enemyTop.characterId}</strong>
                </div>
                <p className="overlay-subtext">
                  {game.battle.playerTop.name} 對上 {game.battle.enemyTop.name}
                </p>
              </div>
            ) : null}
            {game.battle && battlePhase === "countdown" ? (
              <div className="arena-overlay countdown-overlay">
                <p className="countdown-number">{countdown}</p>
              </div>
            ) : null}
            {game.battle && battlePhase === "result" ? (
              <div className="arena-banner">
                {game.battle.winner === "player"
                  ? "WIN"
                  : game.battle.winner === "enemy"
                    ? "LOSE"
                    : "DRAW"}
              </div>
            ) : null}
            <TopEffect
              effect={playerEffect}
              left={arenaState?.playerX ?? 84}
              top={arenaState?.playerY ?? 160}
              radius={arenaState?.playerRadius ?? 22}
              active={battlePhase === "fighting"}
              impactActive={impactState.active}
            />
            <div
              className={`top-token player-token ${battlePhase === "fighting" ? "top-fast" : ""} ${impactState.active ? "top-impact" : ""}`}
              style={{
                left: `${arenaState?.playerX ?? 84}px`,
                top: `${arenaState?.playerY ?? 160}px`,
                width: `${arenaState?.playerRadius ?? 22}px`,
                height: `${arenaState?.playerRadius ?? 22}px`,
              }}
            >
              {game.playerTop?.characterId ?? "P"}
            </div>
            <TopEffect
              effect={enemyEffect}
              left={arenaState?.enemyX ?? 236}
              top={arenaState?.enemyY ?? 160}
              radius={arenaState?.enemyRadius ?? 22}
              active={battlePhase === "fighting"}
              impactActive={impactState.active}
            />
            <div
              className={`top-token enemy-token ${battlePhase === "fighting" ? "top-fast" : ""} ${impactState.active ? "top-impact" : ""}`}
              style={{
                left: `${arenaState?.enemyX ?? 236}px`,
                top: `${arenaState?.enemyY ?? 160}px`,
                width: `${arenaState?.enemyRadius ?? 22}px`,
                height: `${arenaState?.enemyRadius ?? 22}px`,
              }}
            >
              {game.battle?.enemyTop.characterId ?? "E"}
            </div>
          </div>
          {game.battle ? (
            <div className="detail-grid">
              <InfoRow label={game.battle.playerTop.name} value={`轉速 ${arenaState?.playerSpin ?? 0}`} />
              <InfoRow
                label={revealedResult ? game.battle.enemyTop.name : "未知敵方戰陀"}
                value={`轉速 ${arenaState?.enemySpin ?? 0}`}
              />
              <InfoRow label="比賽階段" value={battlePhase === "result" ? "結果揭露" : battlePhase === "fighting" ? "戰鬥進行中" : battlePhase === "countdown" ? "倒數準備" : "對陣展示"} />
              {revealedResult ? (
                <InfoRow
                  label="勝負"
                  value={
                    game.battle.winner === "player"
                      ? "玩家勝"
                      : game.battle.winner === "enemy"
                        ? "敵方勝"
                        : "平手"
                  }
                />
              ) : null}
            </div>
          ) : (
            <p className="panel-text">完成評分後，即可用你的字生成戰陀並挑戰 AI 對手。</p>
          )}
        </article>

        <article className="glass-card">
          <div className="section-head">
            <Trophy size={18} />
            <h2>對戰紀錄</h2>
          </div>
          {game.battle && currentLog ? (
            <>
              <div className="info-row">
                <span>對手</span>
                <strong>
                  {revealedResult
                    ? `${game.battle.enemyTop.characterId}｜${game.battle.enemyTop.grade}｜${game.battle.enemyTop.name}`
                    : "對戰中，資料揭露鎖定"}
                </strong>
              </div>
              {revealedResult ? (
                <div className="stats-grid">
                  <StatCard label="重" value={game.battle.enemyTop.stats.weight} />
                  <StatCard label="穩" value={game.battle.enemyTop.stats.stability} />
                  <StatCard label="攻" value={game.battle.enemyTop.stats.attack} />
                  <StatCard label="防" value={game.battle.enemyTop.stats.defense} />
                </div>
              ) : null}
              <div className="log-box tall">
                {visibleLogs.length === 0 ? (
                  <p className="panel-text">過場播放中，戰報尚未開始。</p>
                ) : null}
                {visibleLogs.map((log) => (
                  <div key={log.round} className="record-item battle-record">
                    <strong>R{log.round}</strong>
                    <span>你造成 {log.playerDamage}</span>
                    <span>敵造成 {log.enemyDamage}</span>
                    <span>
                      {log.playerSpin} / {log.enemySpin}
                    </span>
                    {log.event ? <em>{log.event}</em> : null}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <ul className="bullet-list">
              <li>第一版是自動戰鬥，先驗證寫字評分是否能穩定轉成戰力。</li>
              <li>下一版可加上點擊加速、長按防禦、方向滑動等半操作戰鬥。</li>
              <li>若要做線上模式，再接 `Socket.IO` 做配對與同步。</li>
            </ul>
          )}
        </article>
      </section>
    </main>
  );
}

function getCharacterEffect(characterId?: CharacterId) {
  if (characterId === "火") {
    return "fire";
  }
  if (characterId === "風") {
    return "wind";
  }
  if (characterId === "霸") {
    return "shock";
  }
  return "none";
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-card">
      <div className="stat-head">
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SpinMeter({
  label,
  value,
  percent,
  align,
}: {
  label: string;
  value: number;
  percent: number;
  align: "left" | "right";
}) {
  return (
    <div className={`spin-meter ${align}`}>
      <div className="spin-meter-head">
        <span>{label}</span>
        <strong>{Math.round(value)}</strong>
      </div>
      <div className="spin-meter-track">
        <div className="spin-meter-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function TopEffect({
  effect,
  left,
  top,
  radius,
  active,
  impactActive,
}: {
  effect: "fire" | "wind" | "shock" | "none";
  left: number;
  top: number;
  radius: number;
  active: boolean;
  impactActive: boolean;
}) {
  if (effect === "none") {
    return null;
  }

  const size = radius + 20;

  if (effect === "fire") {
    return (
      <div
        className={`fx-anchor ${active ? "fx-visible" : ""}`}
        style={{ left: `${left}px`, top: `${top}px`, width: `${size}px`, height: `${size}px` }}
      >
        <div className="fire-tail" />
      </div>
    );
  }

  if (effect === "wind") {
    return (
      <div
        className={`fx-anchor ${active ? "fx-visible" : ""}`}
        style={{ left: `${left}px`, top: `${top}px`, width: `${size + 16}px`, height: `${size + 16}px` }}
      >
        <div className="wind-echo wind-echo-1" />
        <div className="wind-echo wind-echo-2" />
        <div className="wind-echo wind-echo-3" />
      </div>
    );
  }

  if (effect === "shock" && impactActive) {
    return (
      <div
        className="fx-anchor fx-visible"
        style={{ left: `${left}px`, top: `${top}px`, width: `${size + 22}px`, height: `${size + 22}px` }}
      >
        <div className="shockwave-ring" />
      </div>
    );
  }

  return null;
}
