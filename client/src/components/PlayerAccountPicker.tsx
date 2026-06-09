import { formatLevelName } from "../utils/mahjongLevel";

export type PlayerAccount = {
  id: number;
  level?: {
    id: number;
    score: number;
  };
  latestTimestamp?: number;
  nickname: string;
};

type PlayerAccountPickerProps = {
  disabled?: boolean;
  onSelect: (player: PlayerAccount) => void;
  players: readonly PlayerAccount[];
};

function formatRecentTime(timestamp?: number): string {
  if (typeof timestamp !== "number") return "최근 대국 없음";
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(timestamp * 1000));
}

function formatLevel(player: PlayerAccount): string {
  if (!player.level) return "등급 정보 없음";
  return `${formatLevelName(player.level.id)} ${player.level.score}pt`;
}

export function PlayerAccountPicker({ disabled = false, onSelect, players }: PlayerAccountPickerProps) {
  if (players.length === 0) return null;

  return (
    <section className="account-picker" aria-label="계정 선택">
      <h3>계정 선택</h3>
      <div className="account-option-list">
        {players.map((player) => {
          const canSelect = !disabled && typeof player.latestTimestamp === "number";

          return (
            <button
              className="account-option"
              disabled={!canSelect}
              key={player.id}
              onClick={() => onSelect(player)}
              type="button"
            >
              <span className="account-option-name">{player.nickname}</span>
              <span className="account-option-meta">ID {player.id}</span>
              <span className="account-option-meta">{formatLevel(player)}</span>
              <span className="account-option-meta">최근 {formatRecentTime(player.latestTimestamp)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
