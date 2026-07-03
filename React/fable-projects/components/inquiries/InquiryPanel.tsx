"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatJstDate } from "@/lib/datetime";
import type { Inquiry, InquiryMessageWithSender } from "@/types/database";
import Button from "@/components/ui/Button";
import Loading from "@/components/ui/Loading";
import Modal from "@/components/ui/Modal";
import Toast from "@/components/ui/Toast";
import InquiryThread from "@/components/inquiries/InquiryThread";

// U-05 問い合わせ（INQ-01 送信 / INQ-02 履歴）
// 左（スマホでは上）に自分のスレッド一覧、選択でメッセージ表示＋追記
export default function InquiryPanel({
  currentUserId,
}: {
  currentUserId: string;
}) {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<InquiryMessageWithSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchInquiries = useCallback(async () => {
    const supabase = createClient();
    // RLS で自分のスレッドのみ返るが、コード側でも user_id 条件を付ける（多層防御）
    const { data, error: fetchError } = await supabase
      .from("inquiries")
      .select("*")
      .eq("user_id", currentUserId)
      .order("updated_at", { ascending: false });
    if (fetchError) {
      setError("問い合わせの取得に失敗しました");
    } else {
      setInquiries(data ?? []);
    }
    setLoading(false);
  }, [currentUserId]);

  const fetchMessages = useCallback(async (inquiryId: number) => {
    const supabase = createClient();
    const { data, error: fetchError } = await supabase
      .from("inquiry_messages")
      .select("*, profiles(display_name)")
      .eq("inquiry_id", inquiryId)
      .order("created_at", { ascending: true });
    if (fetchError) {
      setError("メッセージの取得に失敗しました");
    } else {
      setMessages(data ?? []);
    }
    setMessagesLoading(false);
  }, []);

  useEffect(() => {
    // データ取得の setState は await 後（非同期）でありカスケードレンダーにならない
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInquiries();
  }, [fetchInquiries]);

  const selectInquiry = (id: number) => {
    setSelectedId(id);
    setMessagesLoading(true);
    fetchMessages(id);
  };

  // INQ-01: 新規問い合わせ（スレッド作成＋最初のメッセージ）
  const handleCreate = async () => {
    const trimmedSubject = subject.trim();
    const trimmedBody = body.trim();
    if (!trimmedSubject || !trimmedBody) {
      setError("件名と内容を入力してください");
      return;
    }
    setCreating(true);
    const supabase = createClient();
    try {
      const { data: inserted, error: inquiryError } = await supabase
        .from("inquiries")
        .insert({ user_id: currentUserId, subject: trimmedSubject })
        .select("id")
        .single();
      if (inquiryError || !inserted) throw inquiryError ?? new Error("insert failed");
      const { error: messageError } = await supabase
        .from("inquiry_messages")
        .insert({
          inquiry_id: inserted.id,
          sender_id: currentUserId,
          sender_type: "user",
          message: trimmedBody,
        });
      if (messageError) throw messageError;
      setCreateOpen(false);
      setSubject("");
      setBody("");
      await fetchInquiries();
      selectInquiry(inserted.id);
    } catch {
      setError("問い合わせの送信に失敗しました");
    } finally {
      setCreating(false);
    }
  };

  const handleSend = async (message: string) => {
    if (selectedId === null) return;
    setSending(true);
    const supabase = createClient();
    const { error: sendError } = await supabase.from("inquiry_messages").insert({
      inquiry_id: selectedId,
      sender_id: currentUserId,
      sender_type: "user",
      message,
    });
    setSending(false);
    if (sendError) {
      setError("メッセージの送信に失敗しました");
      return;
    }
    await Promise.all([fetchMessages(selectedId), fetchInquiries()]);
  };

  if (loading) return <Loading />;

  const selected = inquiries.find((i) => i.id === selectedId) ?? null;

  return (
    <div>
      {error && <Toast message={error} onClose={() => setError(null)} />}

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">問い合わせ</h1>
        <Button onClick={() => setCreateOpen(true)}>新規問い合わせ</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-[16rem_1fr]">
        <div className="rounded-lg bg-white shadow">
          {inquiries.map((inquiry) => (
            <button
              key={inquiry.id}
              type="button"
              onClick={() => selectInquiry(inquiry.id)}
              className={`block w-full border-b border-gray-100 px-4 py-3 text-left text-sm last:border-0 hover:bg-gray-50 ${
                selectedId === inquiry.id ? "bg-blue-50" : ""
              }`}
            >
              <span className="block truncate font-medium">
                {inquiry.subject}
              </span>
              <span className="text-xs text-gray-500">
                {formatJstDate(inquiry.updated_at)}
              </span>
            </button>
          ))}
          {inquiries.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-gray-400">
              問い合わせはありません
            </p>
          )}
        </div>

        <div className="rounded-lg bg-white p-4 shadow">
          {selected === null ? (
            <p className="py-8 text-center text-sm text-gray-400">
              問い合わせを選択してください
            </p>
          ) : messagesLoading ? (
            <Loading />
          ) : (
            <>
              <h2 className="mb-3 border-b border-gray-100 pb-2 font-medium">
                {selected.subject}
              </h2>
              <InquiryThread
                messages={messages}
                onSend={handleSend}
                sending={sending}
                viewerType="user"
              />
            </>
          )}
        </div>
      </div>

      <Modal
        open={createOpen}
        title="新規問い合わせ"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              閉じる
            </Button>
            <Button onClick={handleCreate} loading={creating}>
              送信する
            </Button>
          </>
        }
      >
        <div className="mb-4">
          <label htmlFor="inquiry-subject" className="mb-1 block text-sm font-medium">
            件名
          </label>
          <input
            id="inquiry-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="例：予約のキャンセルについて"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="inquiry-body" className="mb-1 block text-sm font-medium">
            内容
          </label>
          <textarea
            id="inquiry-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="お問い合わせ内容を入力してください"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </Modal>
    </div>
  );
}
