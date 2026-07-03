"use client";

import { useState } from "react";
import { formatJstDate, formatJstTime } from "@/lib/datetime";
import type { InquiryMessageWithSender } from "@/types/database";
import Button from "@/components/ui/Button";

// 問い合わせスレッドのメッセージ一覧＋返信欄（U-05 / A-07 共用）
// チャットバブル形式の表示は INQ-05（Phase3）のスコープのため、
// Phase2 では送信者ラベル付きのシンプルなリスト表示とする（設計判断）
type Props = {
  messages: InquiryMessageWithSender[];
  onSend: (message: string) => Promise<void>;
  sending: boolean;
};

export default function InquiryThread({ messages, onSend, sending }: Props) {
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
        {messages.map((m) => (
          <div key={m.id} className="rounded-md bg-gray-50 p-3 text-sm">
            <p className="mb-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span
                className={`rounded px-1.5 py-0.5 font-medium ${
                  m.sender_type === "admin"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {m.sender_type === "admin" ? "管理者" : "ユーザー"}
              </span>
              <span>{m.profiles?.display_name ?? "不明"}</span>
              <span>
                {formatJstDate(m.created_at)} {formatJstTime(m.created_at)}
              </span>
            </p>
            <p className="whitespace-pre-wrap">{m.message}</p>
          </div>
        ))}
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
