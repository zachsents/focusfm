import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
} from "motion/react"
import {
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type WheelEvent,
} from "react"

import { cn } from "@/lib/utils"

const MAX_OVERFLOW = 24
const EMPHASIS_TRANSITION = { duration: 0.1 }

interface SliderStyle extends React.CSSProperties {
  "--slider-accent": string
  "--slider-progress": string
}

interface ElasticSliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  accent?: string
  className?: string
  orientation?: "horizontal" | "vertical"
  startIcon?: ReactNode
  endIcon?: ReactNode
  valueLabel?: string
  showLabel?: boolean
  resetValue?: number
  onChange: (value: number) => void
}

type SliderRegion = "left" | "middle" | "right"

/** React Bits' spring slider, adapted as an accessible controlled input. */
export function ElasticSlider({
  label,
  value,
  min,
  max,
  step,
  accent = "var(--ink)",
  className,
  orientation = "horizontal",
  startIcon = <>−</>,
  endIcon = <>+</>,
  valueLabel,
  showLabel = true,
  resetValue = (min + max) / 2,
  onChange,
}: ElasticSliderProps) {
  const isVertical = orientation === "vertical"
  const sliderRef = useRef<HTMLDivElement>(null)
  const [region, setRegion] = useState<SliderRegion>("middle")
  const clientPosition = useMotionValue(0)
  const overflow = useMotionValue(0)
  const emphasis = useMotionValue(1)
  const sliderOpacity = useTransform(emphasis, [1, 1.2], [0.86, 1])
  const trackSquash = useTransform(overflow, [0, MAX_OVERFLOW], [1, 0.9])
  const trackThickness = useTransform(
    emphasis,
    [1, 1.2],
    isVertical ? [26, 32] : [8, 11],
  )
  const trackMargin = useTransform(emphasis, [1, 1.2], [0, -1.5])
  const trackStretch = useTransform(() => {
    const bounds = sliderRef.current?.getBoundingClientRect()
    const length = isVertical ? bounds?.height : bounds?.width
    return length ? 1 + overflow.get() / length : 1
  })
  const trackOrigin = useTransform(() => {
    const bounds = sliderRef.current?.getBoundingClientRect()
    if (!bounds) return "center"
    if (isVertical) {
      return clientPosition.get() < bounds.top + bounds.height / 2
        ? "bottom"
        : "top"
    }
    return clientPosition.get() < bounds.left + bounds.width / 2
      ? "right"
      : "left"
  })
  const startIconOffset = useTransform(() =>
    region === "left" ? -overflow.get() : 0,
  )
  const endIconOffset = useTransform(() =>
    region === "right" ? overflow.get() : 0,
  )
  const thumbOffset = useTransform(() => {
    const direction = region === "left" ? -1 : region === "right" ? 1 : 0
    return direction * overflow.get()
  })
  const thumbStretch = useTransform(overflow, [0, MAX_OVERFLOW], [1, 1.04])
  const thumbSquash = useTransform(overflow, [0, MAX_OVERFLOW], [1, 0.97])
  const progress = max === min ? 0 : ((value - min) / (max - min)) * 100

  useMotionValueEvent(clientPosition, "change", (latest) => {
    const bounds = sliderRef.current?.getBoundingClientRect()
    if (!bounds) return

    const start = isVertical ? bounds.top : bounds.left
    const end = isVertical ? bounds.bottom : bounds.right
    const nextRegion =
      latest < start ? "left" : latest > end ? "right" : "middle"
    const overshoot =
      nextRegion === "left"
        ? start - latest
        : nextRegion === "right"
          ? latest - end
          : 0

    setRegion(nextRegion)
    overflow.jump(decay(overshoot, MAX_OVERFLOW))
  })

  const setClampedValue = (nextValue: number) => {
    const steppedValue = Math.round(nextValue / step) * step
    onChange(Math.min(Math.max(steppedValue, min), max))
  }

  const updateFromPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = sliderRef.current?.getBoundingClientRect()
    if (event.buttons <= 0 || !bounds) return

    const pointerProgress = isVertical
      ? 1 - (event.clientY - bounds.top) / bounds.height
      : (event.clientX - bounds.left) / bounds.width
    setClampedValue(min + pointerProgress * (max - min))
    clientPosition.jump(isVertical ? event.clientY : event.clientX)
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    updateFromPointer(event)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerUp = () => {
    animate(overflow, 0, {
      type: "spring",
      stiffness: 900,
      damping: 42,
      mass: 0.35,
    })
  }

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    const primaryDelta = event.deltaY
    const crossAxisDelta = event.deltaX
    if (!primaryDelta || Math.abs(primaryDelta) <= Math.abs(crossAxisDelta)) {
      return
    }

    event.preventDefault()
    const increments = Math.min(
      5,
      Math.max(1, Math.round(Math.abs(primaryDelta) / 30)),
    )
    const direction = -Math.sign(primaryDelta)
    setClampedValue(value + direction * step * increments)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const direction =
      event.key === "ArrowRight" || event.key === "ArrowUp"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowDown"
          ? -1
          : 0

    if (direction) {
      event.preventDefault()
      setClampedValue(value + step * direction)
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault()
      onChange(event.key === "Home" ? min : max)
    }
  }

  const sliderStyle: SliderStyle = {
    "--slider-accent": accent,
    "--slider-progress": `${progress}%`,
  }

  return (
    <div
      className={cn(
        "min-w-0 gap-[0.4rem] select-none",
        isVertical ? "flex min-h-0 flex-col items-stretch" : "grid",
        className,
      )}
      style={sliderStyle}
    >
      <div
        data-slot="elastic-slider-heading"
        className={cn(
          "flex text-[0.66rem] font-bold text-[var(--ink-soft)]",
          isVertical
            ? "order-2 min-h-[1.65rem] justify-center pt-[0.2rem] [&>span:first-child]:hidden"
            : showLabel
              ? "justify-between"
              : "justify-end",
        )}
      >
        {showLabel ? <span>{label}</span> : null}
        <span
          data-slot="elastic-slider-value"
          className={cn(
            "text-[var(--ink)] tabular-nums",
            isVertical && "text-[0.9rem] font-bold",
          )}
        >
          {valueLabel ?? Math.round(value)}
        </span>
      </div>
      <motion.div
        data-slot="elastic-slider-control"
        className={cn(
          "flex w-full items-center gap-[0.45rem] [touch-action:none]",
          isVertical && "order-1 min-h-0 flex-1 flex-col",
        )}
        style={{ opacity: sliderOpacity }}
      >
        <motion.span
          data-slot="elastic-slider-icon"
          className="grid shrink-0 place-items-center text-[var(--ink-soft)] empty:hidden"
          aria-hidden="true"
          animate={{
            scale: region === "left" ? [1, 1.4, 1] : 1,
            transition: { duration: 0.12 },
          }}
          style={isVertical ? { y: startIconOffset } : { x: startIconOffset }}
        >
          {startIcon}
        </motion.span>

        <motion.div
          ref={sliderRef}
          data-slot="elastic-slider-rail"
          className={cn(
            "relative flex w-full flex-1 cursor-grab items-center select-none [touch-action:none] active:cursor-grabbing focus-visible:rounded-full focus-visible:outline-[3px_solid_color-mix(in_oklch,var(--focus)_65%,transparent)] focus-visible:outline-offset-1",
            isVertical ? "min-h-0 justify-center p-0" : "py-[0.7rem]",
          )}
          role="slider"
          aria-orientation={orientation}
          tabIndex={0}
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={valueLabel}
          onHoverStart={() => animate(emphasis, 1.2, EMPHASIS_TRANSITION)}
          onHoverEnd={() => animate(emphasis, 1, EMPHASIS_TRANSITION)}
          onTouchStart={() => animate(emphasis, 1.2, EMPHASIS_TRANSITION)}
          onTouchEnd={() => animate(emphasis, 1, EMPHASIS_TRANSITION)}
          onKeyDown={handleKeyDown}
          onWheel={handleWheel}
          onDoubleClick={() => setClampedValue(resetValue)}
          onPointerMove={updateFromPointer}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onLostPointerCapture={handlePointerUp}
        >
          <motion.div
            data-slot="elastic-slider-track-wrapper"
            className={cn("flex flex-1", isVertical && "h-full flex-none")}
            style={
              isVertical
                ? {
                    scaleY: trackStretch,
                    scaleX: trackSquash,
                    transformOrigin: trackOrigin,
                    width: trackThickness,
                    marginLeft: trackMargin,
                    marginRight: trackMargin,
                  }
                : {
                    scaleX: trackStretch,
                    scaleY: trackSquash,
                    transformOrigin: trackOrigin,
                    height: trackThickness,
                    marginTop: trackMargin,
                    marginBottom: trackMargin,
                  }
            }
          >
            <div
              data-slot="elastic-slider-track"
              className={cn(
                "relative h-full flex-1 overflow-hidden rounded-full border border-[color-mix(in_oklch,var(--line-strong),transparent_22%)] bg-[var(--paper-deep)] shadow-[inset_0.12rem_0.12rem_0.28rem_oklch(30%_0.01_250_/_0.22),inset_-0.08rem_-0.08rem_0.18rem_var(--surface-raised)]",
                isVertical && "w-full",
              )}
            >
              <div
                data-slot="elastic-slider-range"
                className={cn(
                  "absolute rounded-[inherit] bg-[var(--slider-accent)] shadow-[0_0_0.55rem_color-mix(in_oklch,var(--slider-accent),transparent_58%)]",
                  isVertical
                    ? "inset-x-0 bottom-0 h-[var(--slider-progress)] w-full"
                    : "inset-y-0 left-0 w-[var(--slider-progress)]",
                )}
              />
            </div>
          </motion.div>
          <motion.span
            data-slot="elastic-slider-thumb"
            className={cn(
              "absolute flex items-center justify-center gap-[0.12rem] border border-[color-mix(in_oklch,var(--line),var(--ink)_8%)] bg-[linear-gradient(145deg,var(--surface-raised),var(--paper-deep))] shadow-[0_0.22rem_0.5rem_oklch(25%_0.01_250_/_0.24),0_0.08rem_0_color-mix(in_oklch,var(--line-strong),transparent_35%),inset_0_1px_0_var(--surface-raised)]",
              isVertical
                ? "bottom-[var(--slider-progress)] left-1/2 h-[2.55rem] w-[5.5rem] translate-x-[-50%] translate-y-1/2 rounded-[0.8rem]"
                : "top-1/2 left-[var(--slider-progress)] h-[1.55rem] w-8 translate-x-[-50%] translate-y-[-50%] rounded-[0.58rem]",
            )}
            aria-hidden="true"
            style={
              isVertical
                ? {
                    y: thumbOffset,
                    scaleY: thumbStretch,
                    scaleX: thumbSquash,
                    transformOrigin: trackOrigin,
                  }
                : {
                    x: thumbOffset,
                    scaleX: thumbStretch,
                    scaleY: thumbSquash,
                    transformOrigin: trackOrigin,
                  }
            }
          />
        </motion.div>

        <motion.span
          data-slot="elastic-slider-icon"
          className="grid shrink-0 place-items-center text-[var(--ink-soft)] empty:hidden"
          aria-hidden="true"
          animate={{
            scale: region === "right" ? [1, 1.4, 1] : 1,
            transition: { duration: 0.12 },
          }}
          style={isVertical ? { y: endIconOffset } : { x: endIconOffset }}
        >
          {endIcon}
        </motion.span>
      </motion.div>
    </div>
  )
}

/** Softly limits the distance used by React Bits' overflow spring. */
function decay(value: number, max: number) {
  if (!max) return 0
  const entry = value / max
  return 2 * (1 / (1 + Math.exp(-entry)) - 0.5) * max
}
