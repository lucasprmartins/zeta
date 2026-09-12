import { useChat } from "@ai-sdk/react";
import { useQuery } from "@tanstack/react-query";
import { DefaultChatTransport } from "ai";
import { useEffect, useState } from "react";
import { ErrorNotice, Loading } from "@/components/feedback";
import { PageContent } from "@/components/layout/page-content";
import { usePermissions, useUserId } from "@/components/permission-boundary";
import { SupportRequest } from "@/features/support/support-request";
import { authClient } from "@/lib/auth";
import { HelpChatView } from "./help-chat-view";
import { HelpGuidesContent } from "./help-guides-content";
import { helpStatusQuery } from "./queries";

export function HelpPage() {
  const access = usePermissions();
  if (access.pending) {
    return (
      <PageContent>
        <Loading />
      </PageContent>
    );
  }
  if (access.error) {
    return (
      <PageContent>
        <ErrorNotice
          message="Não foi possível verificar seu acesso."
          retry={access.retry}
        />
      </PageContent>
    );
  }
  // Limpa mensagens e cancela streaming também quando permissões mudam.
  return (
    <HelpContent
      key={JSON.stringify([access.user.id, [...access.grants].sort()])}
    />
  );
}

async function chatFetch(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, { ...init, credentials: "same-origin" });
  if (response.status === 401 || response.status === 403) {
    await authClient.getSession({ query: { disableCookieCache: true } });
    throw new Error("Seu acesso mudou. Atualize a página para continuar.");
  }
  return response;
}

function HelpContent() {
  const userId = useUserId();
  const availability = useQuery(helpStatusQuery(userId));
  if (availability.isPending) {
    return (
      <PageContent>
        <Loading />
      </PageContent>
    );
  }
  if (availability.isError) {
    return (
      <PageContent>
        <ErrorNotice
          message="Não foi possível carregar a ajuda."
          retry={() => void availability.refetch()}
        />
        <SupportRequest />
      </PageContent>
    );
  }
  return availability.data.configured ? (
    <PageContent viewport>
      <HelpChat />
    </PageContent>
  ) : (
    <PageContent>
      <HelpGuidesContent />
      <SupportRequest />
    </PageContent>
  );
}

function HelpChat() {
  const [lastQuestion, setLastQuestion] = useState("");
  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: "/api/help/chat",
        fetch: chatFetch,
        prepareSendMessagesRequest: ({ messages: outgoing }) => ({
          body: {
            question:
              outgoing
                .at(-1)
                ?.parts.filter((part) => part.type === "text")
                .map((part) => part.text)
                .join("\n") ?? "",
          },
        }),
      })
  );
  const {
    messages,
    sendMessage,
    status,
    error,
    stop,
    setMessages,
    clearError,
  } = useChat({ transport });
  useEffect(
    () => () => {
      void stop();
    },
    [stop]
  );
  const busy = status === "submitted" || status === "streaming";
  function send(question: string) {
    clearError();
    setLastQuestion(question);
    void sendMessage({ text: question });
  }
  return (
    <HelpChatView
      busy={busy}
      disabled={false}
      error={error?.message}
      messages={messages
        .filter(
          (message) => message.role === "user" || message.role === "assistant"
        )
        .map((message) => ({
          id: message.id,
          role: message.role === "user" ? "user" : "assistant",
          text: message.parts
            .filter((part) => part.type === "text")
            .map((part) => part.text)
            .join(""),
        }))}
      notice={undefined}
      onClear={() => {
        setMessages([]);
        clearError();
        setLastQuestion("");
      }}
      onRetry={() => {
        if (lastQuestion && !busy) {
          setMessages([]);
          send(lastQuestion);
        }
      }}
      onSend={send}
      onStop={() => void stop()}
    />
  );
}
