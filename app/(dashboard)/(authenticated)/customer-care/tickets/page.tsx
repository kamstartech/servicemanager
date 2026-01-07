"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
    Search,
    Filter,
    MoreHorizontal,
    MessageSquare,
    CheckCircle2,
    Clock,
    AlertCircle,
    XCircle,
    Smartphone,
    Wallet
} from "lucide-react";
import { gql, useQuery } from "@apollo/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Helper Types (matching GraphQLSchema)
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

enum MobileUserContext {
    MOBILE_BANKING = "MOBILE_BANKING",
    WALLET = "WALLET"
}

interface User {
    username: string;
    phoneNumber?: string;
    context: MobileUserContext;
}

interface Ticket {
    id: string;
    subject: string;
    status: TicketStatus;
    priority: TicketPriority;
    context: MobileUserContext;
    category: string;
    user?: User;
    unreadCount: number;
    updatedAt: string;
    createdAt: string;
    lastMessage?: string;
}

interface TicketsData {
    tickets: {
        tickets: Ticket[];
        total: number;
        page: number;
        pages: number;
    };
}

const GET_TICKETS = gql`
    query GetTickets($status: TicketStatus, $context: MobileUserContext, $search: String, $page: Int, $limit: Int) {
        tickets(status: $status, context: $context, search: $search, page: $page, limit: $limit) {
            tickets {
                id
                subject
                status
                priority
                context
                category
                unreadCount
                updatedAt
                createdAt
                lastMessage
                user {
                    username
                    phoneNumber
                    context
                }
            }
            total
            page
            pages
        }
    }
`;

export default function TicketsPage() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = React.useState("");
    const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
    const [contextFilters, setContextFilters] = React.useState<Record<string, boolean>>({
        [MobileUserContext.MOBILE_BANKING]: true,
        [MobileUserContext.WALLET]: true,
    });

    // Prepare variables for query
    const statusVariable = statusFilter !== "ALL" ? statusFilter : undefined;
    // For simplicity, we just check if one context is selected exclusively. 
    // If both or neither, we don't filter by context on backend (or we could improve backend to accept list).
    // The previous mock implementation filtered strictly. 
    // For now, let's just pass context if ONLY one is selected, otherwise null (all).
    // Actually our backend mock takes single context.
    const contextVariable =
        contextFilters[MobileUserContext.MOBILE_BANKING] && !contextFilters[MobileUserContext.WALLET] ? MobileUserContext.MOBILE_BANKING :
            !contextFilters[MobileUserContext.MOBILE_BANKING] && contextFilters[MobileUserContext.WALLET] ? MobileUserContext.WALLET :
                undefined;

    const { data, loading, error, refetch } = useQuery<TicketsData>(GET_TICKETS, {
        variables: {
            status: statusVariable,
            context: contextVariable,
            search: searchTerm || undefined,
            page: 1,
            limit: 50
        },
        pollInterval: 10000 // Refresh every 10s
    });

    const tickets = data?.tickets.tickets || [];

    // Helper to render priority badge
    const renderPriority = (priority: TicketPriority) => {
        const styles = {
            [TicketPriority.LOW]: "bg-slate-100 text-slate-700 hover:bg-slate-100/80",
            [TicketPriority.MEDIUM]: "bg-blue-100 text-blue-700 hover:bg-blue-100/80",
            [TicketPriority.HIGH]: "bg-orange-100 text-orange-700 hover:bg-orange-100/80",
            [TicketPriority.CRITICAL]: "bg-red-100 text-red-700 hover:bg-red-100/80",
        };
        return <Badge className={`${styles[priority]} border-0`}>{priority}</Badge>;
    };

    // Helper to render status badge
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

    // Helper to render context icon
    const renderContext = (context: MobileUserContext) => {
        return context === MobileUserContext.MOBILE_BANKING ? (
            <div className="flex items-center gap-1.5 text-xs text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile Banking</span>
            </div>
        ) : (
            <div className="flex items-center gap-1.5 text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                <Wallet className="w-3.5 h-3.5" />
                <span>Wallet</span>
            </div>
        );
    };

    // Helper to safely format date
    const formatDate = (dateString: string) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        // Check if date is valid
        if (isNaN(date.getTime())) return "N/A";
        return date.toLocaleDateString();
    };

    // Helper to safely format time
    const formatTime = (dateString: string) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        // Check if date is valid
        if (isNaN(date.getTime())) return "";
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold tracking-tight">Support Tickets</h1>
                <p className="text-muted-foreground">
                    Manage and respond to customer inquiries from Mobile Banking and Wallet.
                </p>
            </div>

            <Tabs defaultValue="ALL" className="w-full" onValueChange={setStatusFilter}>
                <div className="flex items-center justify-between">
                    <TabsList>
                        <TabsTrigger value="ALL">All Tickets</TabsTrigger>
                        <TabsTrigger value="OPEN">Open</TabsTrigger>
                        <TabsTrigger value="IN_PROGRESS">In Progress</TabsTrigger>
                        <TabsTrigger value="RESOLVED">Resolved</TabsTrigger>
                        <TabsTrigger value="CLOSED">Closed</TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search tickets..."
                                className="w-[250px] pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon">
                                    <Filter className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>Filter by Context</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuCheckboxItem
                                    checked={contextFilters[MobileUserContext.MOBILE_BANKING]}
                                    onCheckedChange={(checked) =>
                                        setContextFilters(prev => ({ ...prev, [MobileUserContext.MOBILE_BANKING]: checked }))
                                    }
                                >
                                    Mobile Banking
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem
                                    checked={contextFilters[MobileUserContext.WALLET]}
                                    onCheckedChange={(checked) =>
                                        setContextFilters(prev => ({ ...prev, [MobileUserContext.WALLET]: checked }))
                                    }
                                >
                                    Wallet
                                </DropdownMenuCheckboxItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <div className="mt-4">
                    <Card>
                        <CardHeader className="px-6 py-4 border-b">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                {statusFilter === "ALL" ? "All Tickets" : `${statusFilter.replace("_", " ")} Tickets`}
                                {!loading && (
                                    <span className="text-sm font-normal text-muted-foreground">
                                        ({data?.tickets.total || 0})
                                    </span>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {error ? (
                                <div className="p-8 text-center text-red-500">
                                    Error loading tickets: {error.message}
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[80px]">ID</TableHead>
                                            <TableHead className="w-[300px]">Subject / Category</TableHead>
                                            <TableHead>Customer</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Priority</TableHead>
                                            <TableHead>Last Update</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading && tickets.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                                    Loading tickets...
                                                </TableCell>
                                            </TableRow>
                                        ) : tickets.length > 0 ? (
                                            tickets.map((ticket) => (
                                                <TableRow
                                                    key={ticket.id}
                                                    className="cursor-pointer hover:bg-muted/50"
                                                    onClick={() => router.push(`/customer-care/tickets/${ticket.id}`)}
                                                >
                                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                                        #{ticket.id}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-1">
                                                            <span className="font-medium truncate max-w-[280px]">
                                                                {ticket.subject}
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
                                                                    {ticket.category || "General"}
                                                                </span>
                                                                {ticket.unreadCount > 0 && (
                                                                    <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                                                                        <MessageSquare className="w-3 h-3" />
                                                                        {ticket.unreadCount} new
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                                                {(ticket.user?.username || "Unknown").charAt(0)}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-medium">{ticket.user?.username || "Unknown User"}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs text-muted-foreground">
                                                                        {ticket.user?.phoneNumber || "No Phone"}
                                                                    </span>
                                                                    {renderContext(ticket.context)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{renderStatus(ticket.status)}</TableCell>
                                                    <TableCell>{renderPriority(ticket.priority)}</TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col text-xs text-muted-foreground">
                                                            <span>{formatDate(ticket.updatedAt)}</span>
                                                            <span>{formatTime(ticket.updatedAt)}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    router.push(`/customer-care/tickets/${ticket.id}`);
                                                                }}>
                                                                    View Details
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={(e) => e.stopPropagation()}>Reply</DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem className="text-destructive" onClick={(e) => e.stopPropagation()}>
                                                                    Close Ticket
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={7} className="h-24 text-center">
                                                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                                                        <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
                                                        <p>No tickets found matching your filters</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </Tabs>
        </div>
    );
}
