"use client";

import { useState } from "react";
import { formatJstDate, formatJstTime } from "@/lib/datetime";
import type { InquiryMessageWithSender } from "@/types/database";
import Button from "@/components/ui/Button";

// 問い合わせスレッドのメッセージ一覧＋返信欄（U-05 / A-07 共用）
// INQ-05 チャット形式表示: 自分（viewerType と同じ送信者種別）のメッセージを
// 右寄せの吹き出し、相手を左寄せで表示する
type Props = {
  messages: InquiryMessageWithSender[];
  onSend: (message: string) => Promise<void>;
  sending: boolean;
  // 表示者の立場（U-05 = "user" / A-07 = "admin"）
  viewerType: "user" | "admin";
};

export default function InquiryThread({
  messages,
  onSend,
  sending,
  viewerType,
}: Props) {
  const [draft, setDraft] = useState("");

  const handleSend = async () => {
    const message = draft.trim();
    if (!message) return;
    await onSend(message);
    setDraft("");
  };

  return (
    <div>
      <div className="mb-4 space-y-3">
        {messages.map((m) => {
          const isOwn = m.sender_type === viewerType;
          return (
            <div
              key={m.id}
              className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}
            >
              <p className="mb-0.5 flex items-center gap-2 px-1 text-xs text-gray-500">
                <span>
                  {m.sender_type === "admin" ? "管理者" : ""}
                  {m.profiles?.display_name ?? "不明"}
                </span>
                <span>
                  {formatJstDate(m.created_at)} {formatJstTime(m.created_at)}
                </span>
              </p>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                  isOwn
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                {m.message}
              </div>
            </div>
          );
        })}
        {messages.length === 0 && (
          <p className="py-4 text-center text-sm text-gray-400">
            メッセージがありません
          </p>
        )}
      </div>

      <div className="flex items-end gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          placeholder="メッセージを入力"
          aria-label="返信メッセージ"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <Button onClick={handleSend} loading={sending} disabled={!draft.trim()}>
          送信
        </Button>
      </div>
    </div>
  );
}
