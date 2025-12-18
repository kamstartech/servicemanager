
"use client";

import { useState } from "react";
import { Copy, ChevronDown, ChevronRight, Database, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface VariableExplorerProps {
    previousSteps: any[];
    forms: any[];
    onCopy?: (variable: string) => void;
}

export function VariableExplorer({ previousSteps, forms, onCopy }: VariableExplorerProps) {
    const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});

    const toggleStep = (stepId: string) => {
        setExpandedSteps((prev) => ({
            ...prev,
            [stepId]: !prev[stepId],
        }));
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Variable copied to clipboard");
        if (onCopy) {
            onCopy(text);
        }
    };

    const VariableRow = ({ label, variable, type }: { label: string; variable: string; type: string }) => (
        <div className="flex items-center justify-between py-1.5 px-2 hover:bg-muted/50 rounded-md group">
            <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium truncate" title={label}>
                    {label}
                </span>
                <code className="text-xs text-muted-foreground truncate font-mono" title={variable}>
                    {`{{ ${variable} }}`}
                </code>
            </div>
            <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleCopy(`{{ ${variable} }}`)}
            >
                <Copy className="h-3 w-3" />
            </Button>
        </div>
    );

    if (previousSteps.length === 0) {
        return (
            <div className="text-center py-4 text-muted-foreground text-sm border rounded-md bg-muted/20">
                No previous steps to collect data from.
            </div>
        );
    }

    return (
        <div className="border rounded-md bg-background">
            <div className="p-3 border-b bg-muted/20 flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Available Variables</h3>
            </div>
            <ScrollArea className="h-[250px]">
                <div className="p-2 space-y-1">
                    {previousSteps.map((step, index) => {
                        const isExpanded = expandedSteps[step.id];
                        const stepResultVar = `step_${step.order}_result`;

                        // Determine fields based on step type
                        let fields: { label: string; id: string; type: string }[] = [];

                        if (step.type === "FORM" && step.config?.formId) {
                            const form = forms.find(f => f.id === step.config.formId);
                            if (form && form.schema && form.schema.fields) {
                                fields = form.schema.fields.map((field: any) => ({
                                    label: field.label,
                                    id: `${stepResultVar}.${field.id}`,
                                    type: field.type
                                }));
                            }
                        } else if (step.type === "API_CALL") {
                            // We might not know the fields, but we give the base result
                            fields = [{ label: "API Response Body", id: stepResultVar, type: "object" }];
                        }

                        return (
                            <div key={step.id} className="border rounded-md overflow-hidden">
                                <button
                                    onClick={() => toggleStep(step.id)}
                                    className={cn(
                                        "w-full flex items-center justify-between p-2 text-left hover:bg-muted/50 transition-colors",
                                        isExpanded && "bg-muted/30"
                                    )}
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        {isExpanded ? (
                                            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                        )}
                                        <Badge variant="outline" className="shrink-0 text-[10px] h-5 px-1">
                                            Step {step.order + 1}
                                        </Badge>
                                        <span className="text-sm font-medium truncate">{step.label}</span>
                                    </div>
                                    <Badge variant="secondary" className="text-[10px] h-5 px-1 ml-2 shrink-0">
                                        {step.type}
                                    </Badge>
                                </button>

                                {isExpanded && (
                                    <div className="border-t bg-muted/10 p-1">
                                        {fields.length > 0 ? (
                                            <div className="space-y-0.5">
                                                {fields.map((field) => (
                                                    <VariableRow
                                                        key={field.id}
                                                        label={field.label}
                                                        variable={field.id}
                                                        type={field.type}
                                                    />
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-2 text-xs text-muted-foreground text-center">
                                                No structured fields available
                                            </div>
                                        )}

                                        {/* Always show the raw result variable */}
                                        <div className="mt-1 pt-1 border-t border-dashed border-gray-200">
                                            <VariableRow
                                                label="Raw Result Object"
                                                variable={stepResultVar}
                                                type="object"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>
        </div>
    );
}
