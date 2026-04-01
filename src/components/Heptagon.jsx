import { useEffect, useRef, useState, useCallback } from "react";
import styles from "./Heptagon.module.css";

const N = 7;
const CX = 260;
const CY = 260;
const RADIUS = 170;
const NODE_R_DEFAULT = 42;   // larger for legibility
const NODE_R_ACTIVE = 52;
const INTRO_SPIN_DEG_PER_SEC = 60;
const INTRO_SPIN_DURATION_MS = 2400;

function getNodePos(index, rotationDeg = 0) {
  const angleDeg = index * (360 / N) - 90 + rotationDeg;
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: CX + RADIUS * Math.cos(rad),
    y: CY + RADIUS * Math.sin(rad),
  };
}

function getRotationToTop(index, currentRot) {
  const raw = -(index * (360 / N));
  let diff = ((raw - (currentRot % 360)) + 540) % 360 - 180;
  return currentRot + diff;
}

// Abbreviate long names for the node label
function getNodeLabel(name) {
  if (name === "Finance & Economy") return ["Finance &", "Economy"];
  if (name === "Human Being") return ["Human", "Being"];
  return name.split(" ");
}

export default function Heptagon({
  domains,
  activeIndex,
  onSelect,
  isIdle,
  centreLabel,       // text shown in centre circle
  onCentreClick,     // callback when centre is clicked
}) {
  const [phase, setPhase] = useState("spinning");
  const [displayRot, setDisplayRot] = useState(0);
  const rotRef = useRef(0);
  const targetRotRef = useRef(null);
  const landingIndexRef = useRef(null);
  const animRef = useRef(null);
  const lastTimeRef = useRef(null);
  const spinStartRef = useRef(Date.now());

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * N);
    landingIndexRef.current = randomIndex;
  }, []);

  useEffect(() => {
    if ((phase === "settled" || phase === "navigating") && activeIndex !== null) {
      targetRotRef.current = getRotationToTop(activeIndex, rotRef.current);
      setPhase("navigating");
    }
  }, [activeIndex]);

  const cancelSpinAndSelect = useCallback((index) => {
    landingIndexRef.current = index;
    targetRotRef.current = getRotationToTop(index, rotRef.current);
    setPhase("landing");
    onSelect(index);
  }, [onSelect]);

  useEffect(() => {
    function animate(time) {
      if (lastTimeRef.current === null) lastTimeRef.current = time;
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = time;

      if (phase === "spinning") {
        const elapsed = Date.now() - spinStartRef.current;
        rotRef.current += INTRO_SPIN_DEG_PER_SEC * dt;
        setDisplayRot(rotRef.current);
        if (elapsed >= INTRO_SPIN_DURATION_MS) {
          targetRotRef.current = getRotationToTop(landingIndexRef.current, rotRef.current);
          setPhase("landing");
          onSelect(landingIndexRef.current);
        }
      } else if (phase === "landing" || phase === "navigating") {
        const diff = targetRotRef.current - rotRef.current;
        if (Math.abs(diff) < 0.2) {
          rotRef.current = targetRotRef.current;
          setDisplayRot(rotRef.current);
          setPhase("settled");
        } else {
          const speed = phase === "navigating" ? 4.5 : 3.5;
          rotRef.current += diff * Math.min(1, dt * speed);
          setDisplayRot(rotRef.current);
        }
      }

      animRef.current = requestAnimationFrame(animate);
    }
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [phase, onSelect]);

  const isSpinning = phase === "spinning" || phase === "landing";

  const polygonPoints = Array.from({ length: N }, (_, i) => {
    const p = getNodePos(i, displayRot);
    return `${p.x},${p.y}`;
  }).join(" ");

  return (
    <svg
      className={styles.svg}
      viewBox="0 0 520 520"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="NextUs Seven Domains Heptagon"
    >
      {/* Outer rings */}
      <circle cx={CX} cy={CY} r={RADIUS + 48} fill="none" stroke="rgba(200,146,42,0.05)" strokeWidth="1" />
      <circle cx={CX} cy={CY} r={RADIUS + 24} fill="none" stroke="rgba(200,146,42,0.08)" strokeWidth="0.5" />

      {/* Heptagon shape */}
      <polygon
        points={polygonPoints}
        fill="rgba(200,146,42,0.03)"
        stroke="rgba(200,146,42,0.18)"
        strokeWidth="1"
      />

      {/* Spokes */}
      {Array.from({ length: N }, (_, i) => {
        const p = getNodePos(i, displayRot);
        return (
          <line key={`spoke-${i}`}
            x1={CX} y1={CY} x2={p.x} y2={p.y}
            stroke="rgba(200,146,42,0.08)" strokeWidth="0.5"
          />
        );
      })}

      {/* Domain nodes */}
      {domains.map((domain, i) => {
        const p = getNodePos(i, displayRot);
        const isActive = !isSpinning && !isIdle && i === activeIndex;
        const r = isActive ? NODE_R_ACTIVE : NODE_R_DEFAULT;
        const words = getNodeLabel(domain.name);
        const fontSize = isActive ? "18" : isSpinning ? "16" : "17";
        const fillColor = "#0F1523";  // always full opacity
        // Card behaviour: matches .nk-option — border at rest, lifts on active
        const nodeFill = isSpinning
          ? "rgba(255,255,255,0.95)"
          : isActive
            ? "rgba(200,146,42,0.06)"
            : "#FFFFFF";
        const nodeStroke = isSpinning
          ? "rgba(200,146,42,0.78)"
          : isActive
            ? "rgba(200,146,42,1)"
            : "rgba(200,146,42,0.78)";
        const nodeStrokeWidth = isActive ? 1.5 : 1;

        return (
          <g
            key={domain.id}
            className={styles.nodeGroup}
            onClick={() => isSpinning ? cancelSpinAndSelect(i) : onSelect(i)}
            role="button"
            tabIndex={0}
            aria-label={`Select domain: ${domain.name}`}
            onKeyDown={(e) => e.key === "Enter" && (isSpinning ? cancelSpinAndSelect(i) : onSelect(i))}
          >
            {isActive && (
              <circle cx={p.x} cy={p.y} r={r + 16} fill="rgba(200,146,42,0.06)" stroke="rgba(200,146,42,0.25)" strokeWidth="1" />
            )}

            <circle
              cx={p.x} cy={p.y} r={r}
              fill={nodeFill}
              stroke={nodeStroke}
              strokeWidth={nodeStrokeWidth}
              className={styles.nodeCircle}
            />

            <text
              x={p.x} y={p.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={fillColor}
              fontSize={fontSize}
              fontFamily="'Cormorant Garamond', Georgia, serif"
              fontWeight={isActive ? "400" : "300"}
              letterSpacing="0.01em"
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              {words.map((word, wi) => (
                <tspan
                  key={wi}
                  x={p.x}
                  dy={wi === 0
                    ? (words.length > 1 ? `-${(words.length - 1) * 0.65}em` : "0.35em")
                    : "1.3em"
                  }
                >
                  {word}
                </tspan>
              ))}
            </text>
          </g>
        );
      })}

      {/* Centre circle — interactive, shows umbrella label */}
      <g
        className={styles.centreGroup}
        onClick={onCentreClick}
        role="button"
        tabIndex={0}
        aria-label={centreLabel ? `${centreLabel} — tap to expand` : "Our Planet"}
        onKeyDown={(e) => e.key === "Enter" && onCentreClick && onCentreClick()}
        style={{ cursor: onCentreClick ? "pointer" : "default" }}
      >
        {/* Pulse ring — breathes to invite interaction */}
        <circle
          cx={CX} cy={CY} r={84}
          fill="none"
          stroke="rgba(200,146,42,0.18)"
          strokeWidth="1"
          style={{ pointerEvents: "none" }}
        >
          <animate
            attributeName="r"
            values="82;90;82"
            dur="3s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="stroke-opacity"
            values="0.18;0.04;0.18"
            dur="3s"
            repeatCount="indefinite"
          />
        </circle>

        {/* Outer static ring */}
        <circle
          cx={CX} cy={CY} r={80}
          fill="none"
          stroke="rgba(200,146,42,0.12)"
          strokeWidth="0.5"
          style={{ pointerEvents: "none" }}
        />

        {/* Main circle */}
        <circle
          cx={CX} cy={CY} r={76}
          fill="#FFFFFF"
          stroke="rgba(200,146,42,0.78)"
          strokeWidth="1.5"
          className={styles.centreCircle}
        />

        {centreLabel && (
          <text
            x={CX} y={CY}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#A8721A"
            fontSize="18"
            fontFamily="'Cormorant Garamond', Georgia, serif"
            fontWeight="400"
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            {centreLabel.split(" ").map((word, wi, arr) => (
              <tspan
                key={wi}
                x={CX}
                dy={wi === 0 ? `${-(arr.length - 1) * 0.6}em` : "1.25em"}
              >
                {word}
              </tspan>
            ))}
          </text>
        )}
      </g>
    </svg>
  );
}
