import { IconTrash } from "nucleo-micro-bold"
import { ElasticSlider } from "#/components/ElasticSlider"
import { SoundIcon } from "#/components/sound-icon"
import { Button } from "#/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card"
import { Toggle } from "#/components/ui/toggle"
import { TRACKS_BY_ID } from "#/data/tracks"
import { isBinauralTrack } from "#/lib/binaural"
import type { MixerChannel } from "#/lib/mixer-store"
import { cn } from "#/lib/utils"

interface ChannelStripProps {
  channel: MixerChannel
  position: number
  isDimmed: boolean
  onChange: (channel: MixerChannel) => void
  onRemove: (channelId: string) => void
}

/** Renders one tall mixer strip with a vertical React Bits fader. */
export function ChannelStrip({
  channel,
  position,
  isDimmed,
  onChange,
  onRemove,
}: ChannelStripProps) {
  const track = TRACKS_BY_ID.get(channel.trackId)
  if (!track) return null
  const isBinaural = isBinauralTrack(channel.trackId)

  return (
    <Card
      className={cn(
        "relative h-full min-h-0 w-[clamp(13rem,17vw,15.5rem)] min-w-[clamp(13rem,17vw,15.5rem)] gap-0 overflow-visible rounded-[clamp(1.1rem,1.7vw,1.5rem)] border border-[color-mix(in_oklch,var(--line),var(--surface)_45%)] bg-[linear-gradient(155deg,var(--surface-raised),var(--surface))] p-[var(--strip-padding)] shadow-[0_0.32rem_0_color-mix(in_oklch,var(--line-strong),transparent_40%),0_0.7rem_1.25rem_oklch(30%_0.01_250_/_0.12),inset_0_1px_0_var(--surface-raised)] ring-0 [--strip-padding:clamp(0.8rem,1.4vh,1rem)] animate-[channel-enter_220ms_var(--ease-out)_backwards] transition-[opacity,filter] duration-[120ms] ease-[var(--ease-out)]",
        isDimmed && "opacity-[0.36] contrast-[0.88]",
      )}
      style={{ animationDelay: `${Math.min(position, 5) * 25}ms` }}
      role="group"
      aria-label={`${track.name} channel`}
    >
      <CardHeader className="relative flex min-h-[2.8rem] items-center justify-center gap-2 p-0 text-left">
        <SoundIcon
          className="shrink-0 text-[var(--ink)]"
          trackId={track.id}
          size={28}
        />
        <CardTitle className="font-[var(--font-body)] text-[clamp(0.82rem,1.2vw,1rem)] font-bold tracking-[-0.025em]">
          {track.name}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col p-0">
        <ElasticSlider
          className="min-h-28 flex-1"
          orientation="vertical"
          label={`${track.name} level`}
          value={channel.volume}
          min={0}
          max={1}
          step={0.01}
          accent="var(--ink)"
          startIcon={null}
          endIcon={null}
          valueLabel={`${Math.round(channel.volume * 100)}`}
          onChange={(volume) => onChange({ ...channel, volume })}
        />

        <div className="mx-[calc(var(--strip-padding)*-1)] grid gap-[0.35rem] border-t border-[var(--line)] px-[var(--strip-padding)] pt-[0.55rem] pb-1">
          <ElasticSlider
            label="Tone"
            value={channel.tone}
            min={-1}
            max={1}
            step={0.01}
            accent="var(--ink)"
            startIcon={null}
            endIcon={null}
            valueLabel={
              channel.tone === 0
                ? "flat"
                : `${channel.tone > 0 ? "+" : ""}${Math.round(channel.tone * 10)}`
            }
            onChange={(tone) => onChange({ ...channel, tone })}
          />
          {isBinaural ? (
            <div
              className="grid gap-[0.4rem]"
              aria-label="Balance stereo locked. Headphones required."
            >
              <div className="flex justify-between text-[0.66rem] font-bold text-[var(--ink-soft)]">
                <span>Balance</span>
                <span className="text-[var(--ink)]">stereo locked</span>
              </div>
              <div className="grid min-h-[2.3rem] place-items-center rounded-full border border-[color-mix(in_oklch,var(--line-strong),transparent_22%)] bg-[var(--paper-deep)] px-3 text-[0.62rem] font-bold tracking-[0.04em] text-[var(--ink-soft)] uppercase shadow-[inset_0.12rem_0.12rem_0.28rem_oklch(30%_0.01_250_/_0.16)]">
                Headphones required
              </div>
            </div>
          ) : (
            <ElasticSlider
              label="Balance"
              value={channel.pan}
              min={-1}
              max={1}
              step={0.01}
              accent="var(--ink)"
              startIcon={null}
              endIcon={null}
              valueLabel={
                channel.pan === 0
                  ? "center"
                  : `${Math.abs(Math.round(channel.pan * 100))}${channel.pan < 0 ? "L" : "R"}`
              }
              onChange={(pan) => onChange({ ...channel, pan })}
            />
          )}
        </div>

        <div className="flex items-stretch gap-[0.4rem] pt-[0.45rem] [@media(max-height:42rem)]:pt-1">
          <Toggle
            className="min-h-[2.55rem] flex-1 rounded-[0.85rem] text-[0.66rem] font-bold tracking-[0.09em] uppercase"
            variant="skeuomorphic"
            pressed={channel.muted}
            onPressedChange={(muted) => onChange({ ...channel, muted })}
            aria-label={`${channel.muted ? "Unmute" : "Mute"} ${track.name}`}
          >
            M
          </Toggle>
          <Toggle
            className="min-h-[2.55rem] flex-1 rounded-[0.85rem] text-[0.66rem] font-bold tracking-[0.09em] uppercase"
            variant="skeuomorphic"
            pressed={channel.solo}
            onPressedChange={(solo) => onChange({ ...channel, solo })}
            aria-label={`${channel.solo ? "Unsolo" : "Solo"} ${track.name}`}
          >
            S
          </Toggle>
          <Button
            className="min-h-[2.55rem] flex-1 rounded-[0.85rem] text-[var(--ink-soft)] hover:text-[var(--danger)]"
            variant="skeuomorphic"
            size="icon-lg"
            aria-label={`Remove ${track.name}`}
            onClick={() => onRemove(channel.id)}
          >
            <IconTrash />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
