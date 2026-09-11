import {
  ArrowUpIcon,
  BookOpenIcon,
  SparkleIcon,
  StopIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ErrorNotice } from "@/components/feedback";
import { useCurrentUser } from "@/components/permission-boundary";
import { Avatar } from "@/components/ui/avatar";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageHeader,
} from "@/components/ui/message";
import { Textarea } from "@/components/ui/textarea";
import { HelpAnswer } from "./help-answer";

export interface HelpChatViewProps {
  busy: boolean;
  disabled: boolean;
  error: string | undefined;
  messages: { id: string; role: "user" | "assistant"; text: string }[];
  notice: string | undefined;
  onClear: () => void;
  onRetry: () => void;
  onSend: (question: string) => void;
  onStop: () => void;
}

export function HelpChatView({
  busy,
  disabled,
  notice,
  error,
  messages,
  onSend,
  onStop,
  onClear,
  onRetry,
}: HelpChatViewProps) {
  const user = useCurrentUser();
  const [question, setQuestion] = useState("");
  const active = messages.length > 0;
  const composer = useRef<HTMLTextAreaElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const followResponse = useRef(true);
  useEffect(() => {
    if (messages.length && transcript.current && followResponse.current) {
      transcript.current.scrollTop = transcript.current.scrollHeight;
    }
  }, [messages]);
  function submit() {
    if (!question.trim() || busy || disabled) {
      return;
    }
    followResponse.current = true;
    onSend(question.trim());
    setQuestion("");
    composer.current?.focus({ preventScroll: true });
  }
  return (
    <section
      aria-label="Ajuda com IA"
      className="help-chat mx-auto w-full max-w-3xl"
      data-active={active}
    >
      <div aria-hidden={!active} className="help-chat-toolbar" inert={!active}>
        <GuideLink />
        <Button
          disabled={busy}
          onClick={() => {
            onClear();
            followResponse.current = true;
            composer.current?.focus({ preventScroll: true });
          }}
          variant="ghost"
        >
          Limpar perguntas
        </Button>
      </div>
      <div className="help-chat-stage">
        <div
          aria-hidden={active}
          className="help-chat-intro text-center"
          inert={active}
        >
          <SparkleIcon
            aria-hidden="true"
            className="mx-auto mb-5 size-8 text-muted-foreground"
            weight="regular"
          />
          <h1
            className="text-balance font-medium text-3xl tracking-tight sm:text-4xl"
            id="help-heading"
          >
            Como podemos ajudar?
          </h1>
        </div>

        <div
          aria-hidden={!active}
          aria-label="Perguntas e respostas"
          aria-live="polite"
          aria-relevant="additions text"
          className="help-chat-messages space-y-6 overflow-y-auto overscroll-contain"
          inert={!active}
          onScroll={(event) => {
            const element = event.currentTarget;
            followResponse.current =
              element.scrollHeight - element.scrollTop - element.clientHeight <
              64;
          }}
          ref={transcript}
          role="log"
        >
          {messages.map((message) => (
            <Message
              align={message.role === "user" ? "end" : "start"}
              key={message.id}
            >
              <MessageAvatar aria-hidden="true">
                {message.role === "user" ? (
                  <Avatar image={user.image} name={user.name} />
                ) : (
                  <span className="flex size-8 items-center justify-center text-muted-foreground">
                    <SparkleIcon className="size-icon" weight="regular" />
                  </span>
                )}
              </MessageAvatar>
              <MessageContent>
                <MessageHeader>
                  {message.role === "user"
                    ? "Você"
                    : "Assistente do Guia de Uso"}
                </MessageHeader>
                <Bubble variant={message.role === "user" ? "default" : "muted"}>
                  <BubbleContent className="sm:text-base">
                    {message.role === "assistant" ? (
                      <HelpAnswer
                        text={
                          message.text ||
                          (busy
                            ? "Consultando o Guia de Uso…"
                            : "Nenhuma resposta recebida.")
                        }
                      />
                    ) : (
                      <p className="whitespace-pre-wrap">{message.text}</p>
                    )}
                  </BubbleContent>
                </Bubble>
              </MessageContent>
            </Message>
          ))}
        </div>
      </div>
      <div className="help-chat-composer space-y-3">
        <p className="sr-only" role="status">
          {busy ? "Consultando o Guia de Uso…" : ""}
        </p>

        {notice && (
          <p
            className="text-center text-muted-foreground text-sm"
            role="status"
          >
            {notice}
          </p>
        )}
        {error && <ErrorNotice message={error} retry={onRetry} />}
        <form
          className="flex items-end gap-2 rounded-[2rem] border border-input bg-muted/40 p-2 shadow-sm transition-shadow focus-within:ring-3 focus-within:ring-ring/40"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <label className="sr-only" htmlFor="help-question">
            Sua dúvida sobre o sistema
          </label>
          <Textarea
            className="max-h-40 min-h-11 flex-1 resize-none rounded-none border-0 bg-transparent px-4 py-3 shadow-none [field-sizing:content] focus-visible:ring-0"
            disabled={disabled}
            id="help-question"
            maxLength={2000}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                submit();
              }
            }}
            placeholder="Pergunte como usar o sistema…"
            ref={composer}
            rows={1}
            value={question}
          />
          {busy ? (
            <Button
              aria-label="Parar resposta"
              className="size-11 rounded-full p-0"
              onClick={onStop}
            >
              <StopIcon aria-hidden="true" weight="regular" />
            </Button>
          ) : (
            <Button
              aria-label="Enviar pergunta"
              className="size-11 rounded-full p-0"
              disabled={disabled || !question.trim()}
              type="submit"
            >
              <ArrowUpIcon aria-hidden="true" weight="regular" />
            </Button>
          )}
        </form>
      </div>
      <div aria-hidden={active} className="help-chat-footer" inert={active}>
        <div className="pt-2 text-center">
          <GuideLink prominent />
        </div>
      </div>
    </section>
  );
}

function GuideLink({ prominent = false }: { prominent?: boolean }) {
  return (
    <Link
      className={buttonVariants({
        variant: prominent ? "soft" : "ghost",
        className: prominent ? undefined : "text-muted-foreground",
      })}
      to="/help/guides"
    >
      <BookOpenIcon aria-hidden="true" weight="regular" />
      Acessar Guia de Uso
    </Link>
  );
}
