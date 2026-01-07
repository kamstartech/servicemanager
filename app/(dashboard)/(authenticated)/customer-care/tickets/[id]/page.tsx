"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { gql, useQuery, useMutation } from "@apollo/client";
import {
    ArrowLeft,
    Send,
    CheckCircle2,
    XCircle,
    Clock,
    AlertCircle,
    Smartphone,
    Wallet,
    MoreVertical,
    User,
    Shield
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

// --- GraphQL Definitions ---

const GET_TICKET_DETAILS = gql`
  query GetTicketDetails($id: ID!) {
    ticket(id: $id) {
      id
      subject
      status
      priority
      context
      category
      createdAt
      updatedAt
      user {
        username
        phoneNumber
        context
      }
      messages {
        id
        message
        senderType
        createdAt
        readAt
      }
    }
  }
`;

const REPLY_TO_TICKET = gql`
  mutation ReplyToTicket($ticketId: ID!, $message: String!) {
    replyToTicket(ticketId: $ticketId, message: $message) {
      id
      message
      senderType
      createdAt
    }
  }
`;

const UPDATE_TICKET_STATUS = gql`
  mutation UpdateTicketStatus($ticketId: ID!, $status: TicketStatus!) {
    updateTicketStatus(ticketId: $ticketId, status: $status) {
      id
      status
      updatedAt
    }
  }
`;

const TICKET_MESSAGE_SUBSCRIPTION = gql`
  subscription OnTicketMessageAdded($ticketId: ID!) {
    ticketMessageAdded(ticketId: $ticketId) {
      id
      message
      senderType
      createdAt
      readAt
    }
  }
`;

// --- Types ---

enum TicketStatus {
    OPEN = "OPEN",
    IN_PROGRESS = "IN_PROGRESS",
    RESOLVED = "RESOLVED",
    CLOSED = "CLOSED"
}

enum TicketPriority {
    LOW = "LOW",
    MEDIUM = "MEDIUM",
    HIGH = "HIGH",
    CRITICAL = "CRITICAL"
}

enum MessageSenderType {
    USER = "USER",
    ADMIN = "ADMIN"
}

enum MobileUserContext {
    MOBILE_BANKING = "MOBILE_BANKING",
    WALLET = "WALLET"
}

// --- Component ---

export default function TicketDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const scrollRef = React.useRef<HTMLDivElement>(null);

    const [messageInput, setMessageInput] = React.useState("");



    const { data, loading, error, refetch, subscribeToMore } = useQuery(GET_TICKET_DETAILS, {
        variables: { id },
    });

    React.useEffect(() => {
        const unsubscribe = subscribeToMore({
            document: TICKET_MESSAGE_SUBSCRIPTION,
            variables: { ticketId: id },
            updateQuery: (prev, { subscriptionData }) => {
                if (!subscriptionData.data) return prev;
                const newMessage = subscriptionData.data.ticketMessageAdded;

                // Check duplicates (optional but good practice)
                if (prev.ticket.messages.some((m: any) => m.id === newMessage.id)) return prev;

                return {
                    ...prev,
                    ticket: {
                        ...prev.ticket,
                        messages: [...prev.ticket.messages, newMessage]
                    }
                };
            }
        });
        return () => unsubscribe();
    }, [subscribeToMore, id]);

    const [replyToTicket, { loading: sending }] = useMutation(REPLY_TO_TICKET, {
        onCompleted: () => {
            setMessageInput("");
            refetch();
            // Scroll to bottom
            setTimeout(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
            }, 100);
            toast.success("Message sent");
        },
        onError: (err) => {
            toast.error(`Failed to send message: ${err.message}`);
        }
    });

    const [updateStatus, { loading: updating }] = useMutation(UPDATE_TICKET_STATUS, {
        onCompleted: () => {
            refetch();
            toast.success("Status updated");
        },
        onError: (err) => {
            toast.error(`Failed to update status: ${err.message}`);
        }
    });

    React.useEffect(() => {
        if (data?.ticket?.messages) {
            // Scroll to bottom on load
            if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        }
    }, [data?.ticket?.messages]);

    if (loading && !data) return <div className="p-8 text-center text-muted-foreground">Loading ticket details...</div>;
    if (error || !data?.ticket) return <div className="p-8 text-center text-destructive">Error loading ticket: {error?.message || "Ticket not found"}</div>;

    const ticket = data.ticket;

    const handleSend = () => {
        if (!messageInput.trim()) return;
        replyToTicket({ variables: { ticketId: id, message: messageInput } });
    };

    const handleStatusChange = (status: TicketStatus) => {
        updateStatus({ variables: { ticketId: id, status } });
    };

    // Helper renderers (reused logic)
    const renderStatus = (status: TicketStatus) => {
        const configs = {
            [TicketStatus.OPEN]: { icon: AlertCircle, color: "text-blue-600 bg-blue-50 border-blue-200" },
            [TicketStatus.IN_PROGRESS]: { icon: Clock, color: "text-amber-600 bg-amber-50 border-amber-200" },
            [TicketStatus.RESOLVED]: { icon: CheckCircle2, color: "text-green-600 bg-green-50 border-green-200" },
            [TicketStatus.CLOSED]: { icon: XCircle, color: "text-slate-600 bg-slate-50 border-slate-200" },
        };
        const config = configs[status] || configs[TicketStatus.OPEN];
        const Icon = config.icon;
        return (
            <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-medium w-fit ${config.color}`}>
                <Icon className="w-3.5 h-3.5" />
                <span>{status.replace("_", " ")}</span>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-muted/10">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-background border-b shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-bold truncate max-w-lg" title={ticket.subject}>
                                #{ticket.id} - {ticket.subject}
                            </h1>
                            {renderStatus(ticket.status)}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-[10px] font-normal">{ticket.category}</Badge>
                            <span>&bull;</span>
                            <span>Created {new Date(ticket.createdAt).toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                                Actions <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleStatusChange(TicketStatus.IN_PROGRESS)}>
                                Mark In Progress
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(TicketStatus.RESOLVED)}>
                                Mark Resolved
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(TicketStatus.CLOSED)} className="text-destructive">
                                Close Ticket
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden p-6 gap-6">
                {/* Main Chat Area */}
                <Card className="flex-1 flex flex-col shadow-sm border-0 h-full overflow-hidden">
                    {/* Messages List */}
                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/50"
                    >
                        {ticket.messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                <Clock className="h-10 w-10 mb-2 opacity-20" />
                                <p>No messages yet.</p>
                            </div>
                        ) : (
                            ticket.messages.map((msg: any) => {
                                const isAdmin = msg.senderType === MessageSenderType.ADMIN;
                                return (
                                    <div
                                        key={msg.id}
                                        className={`flex w-full ${isAdmin ? "justify-end" : "justify-start"}`}
                                    >
                                        <div className={`flex max-w-[80%] gap-3 ${isAdmin ? "flex-row-reverse" : "flex-row"}`}>
                                            {/* Avatar */}
                                            <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border ${isAdmin ? "bg-primary text-primary-foreground border-primary" : "bg-white text-slate-600 border-slate-200"}`}>
                                                {isAdmin ? <Shield className="h-4 w-4" /> : <User className="h-4 w-4" />}
                                            </div>

                                            {/* Bubble */}
                                            <div className={`flex flex-col space-y-1 ${isAdmin ? "items-end" : "items-start"}`}>
                                                <div className={`px-4 py-2 rounded-lg text-sm shadow-sm ${isAdmin ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-white border border-slate-200 rounded-tl-none"}`}>
                                                    {msg.message}
                                                </div>
                                                <span className="text-[10px] text-muted-foreground px-1">
                                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-background border-t">
                        <div className="flex gap-4">
                            <Textarea
                                placeholder="Type your reply..."
                                className="min-h-[80px] resize-none"
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                disabled={ticket.status === TicketStatus.CLOSED}
                            />
                            <Button
                                className="h-full px-6"
                                onClick={handleSend}
                                disabled={!messageInput.trim() || sending || ticket.status === TicketStatus.CLOSED}
                            >
                                <Send className="h-5 w-5" />
                            </Button>
                        </div>
                        {ticket.status === TicketStatus.CLOSED && (
                            <p className="text-xs text-muted-foreground mt-2 text-center flex items-center justify-center gap-1">
                                <XCircle className="h-3 w-3" /> This ticket is closed. Re-open it to send a reply.
                            </p>
                        )}
                    </div>
                </Card>

                {/* Sidebar Info */}
                <Card className="w-80 h-fit border-0 shadow-sm">
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-sm">Customer Details</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200">
                                {(ticket.user?.username || "U").charAt(0)}
                            </div>
                            <div>
                                <p className="font-medium text-sm leading-none">{ticket.user?.username || "Unknown"}</p>
                                <p className="text-xs text-muted-foreground mt-1">{ticket.user?.phoneNumber}</p>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-3">
                            <div>
                                <span className="text-xs text-muted-foreground block mb-1">Context</span>
                                <div className="flex items-center gap-2">
                                    {ticket.user?.context === MobileUserContext.MOBILE_BANKING ? (
                                        <Smartphone className="h-4 w-4 text-sky-600" />
                                    ) : (
                                        <Wallet className="h-4 w-4 text-purple-600" />
                                    )}
                                    <span className="text-sm">{ticket.user?.context || ticket.context}</span>
                                </div>
                            </div>
                            <div>
                                <span className="text-xs text-muted-foreground block mb-1">Priority</span>
                                <Badge variant="outline" className="font-normal border-slate-200">
                                    {ticket.priority}
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
