import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { shouldShowDebugInfo, simulateNetworkDelay } from "@/lib/devMode";
import { AlertCircle, Check, Loader2, RefreshCw, Send, X } from "lucide-react";
import { useTranslation } from "@/lib/useTranslation";
import { supabase } from "../../../supabase/supabase";

// Hilfsfunktion für Methodenfarben
function getMethodColor(method: string): string {
  switch (method) {
    case "GET":
      return "bg-blue-100 text-blue-800";
    case "POST":
      return "bg-green-100 text-green-800";
    case "PUT":
      return "bg-amber-100 text-amber-800";
    case "DELETE":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

// API-Endpunkt Schnittstelle
interface ApiEndpoint {
  name: string;
  description: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  requiresAuth: boolean;
  requestBody?: Record<string, any>;
}

// API-Endpunkte
const API_ENDPOINTS: ApiEndpoint[] = [
  {
    name: "Get Guests",
    description: "Retrieve all guests",
    method: "GET",
    path: "guests",
    requiresAuth: true,
  },
  {
    name: "Get Tables",
    description: "Retrieve all tables",
    method: "GET",
    path: "tables",
    requiresAuth: true,
  },
  {
    name: "Get Tasks",
    description: "Retrieve all tasks",
    method: "GET",
    path: "tasks",
    requiresAuth: true,
  },
  {
    name: "Send RSVP Reminders",
    description: "Send reminders to guests with pending RSVPs",
    method: "POST",
    path: "rpc/send_rsvp_reminders",
    requiresAuth: true,
    requestBody: { user_id: "" },
  },
];

// Hauptkomponente
export const DevModeApiTester: React.FC = () => {
  const { t } = useTranslation();
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(
    null,
  );
  const [requestBody, setRequestBody] = useState<string>("");
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("endpoints");

  // Wenn Debug-Info nicht angezeigt werden soll, nichts rendern
  if (!shouldShowDebugInfo()) {
    return null;
  }

  // Handler für Endpunktauswahl
  const handleSelectEndpoint = (endpoint: ApiEndpoint) => {
    setSelectedEndpoint(endpoint);
    setRequestBody(
      endpoint.requestBody ? JSON.stringify(endpoint.requestBody, null, 2) : "",
    );
    setResponse(null);
    setError(null);
  };

  // Handler für Anfragenversand
  const handleSendRequest = async () => {
    if (!selectedEndpoint) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      // Netzwerkverzögerung simulieren
      await simulateNetworkDelay();

      let result;

      // Request-Body parsen, falls vorhanden
      const parsedBody = requestBody ? JSON.parse(requestBody) : undefined;

      switch (selectedEndpoint.method) {
        case "GET":
          result = await supabase.from(selectedEndpoint.path).select("*");
          break;
        case "POST":
          if (selectedEndpoint.path.startsWith("rpc/")) {
            const functionName = selectedEndpoint.path.replace("rpc/", "");
            result = await supabase.rpc(functionName, parsedBody);
          } else {
            result = await supabase
              .from(selectedEndpoint.path)
              .insert(parsedBody);
          }
          break;
        case "PUT":
          result = await supabase
            .from(selectedEndpoint.path)
            .update(parsedBody);
          break;
        case "DELETE":
          result = await supabase.from(selectedEndpoint.path).delete();
          break;
      }

      if (result.error) {
        throw new Error(result.error.message);
      }

      setResponse(result.data);
    } catch (err: any) {
      console.error("API request error:", err);
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Handler für benutzerdefinierte Anfragen
  const handleCustomRequest = async () => {
    // Implementierung für benutzerdefinierte Anfragen
  };

  // JSX-Rendering
  return React.createElement(
    Card,
    { className: "border-2 border-blue-300 shadow-md" },
    React.createElement(
      CardHeader,
      { className: "bg-blue-50" },
      React.createElement(
        CardTitle,
        { className: "flex items-center" },
        React.createElement(Send, { className: "h-5 w-5 mr-2 text-blue-600" }),
        t("API Tester"),
      ),
      React.createElement(
        CardDescription,
        null,
        t("Test API endpoints and view responses"),
      ),
    ),
    React.createElement(
      CardContent,
      { className: "p-0" },
      React.createElement(
        Tabs,
        { value: activeTab, onValueChange: setActiveTab, className: "w-full" },
        React.createElement(
          TabsList,
          { className: "w-full grid grid-cols-2" },
          React.createElement(
            TabsTrigger,
            { value: "endpoints" },
            t("Endpoints"),
          ),
          React.createElement(
            TabsTrigger,
            { value: "custom" },
            t("Custom Request"),
          ),
        ),

        // Endpoints Tab Content
        React.createElement(
          TabsContent,
          { value: "endpoints", className: "p-4 space-y-4" },
          // Endpoints list
          React.createElement(
            "div",
            { className: "grid grid-cols-2 gap-2" },
            API_ENDPOINTS.map((endpoint) =>
              React.createElement(
                Button,
                {
                  key: endpoint.name,
                  variant:
                    selectedEndpoint?.name === endpoint.name
                      ? "default"
                      : "outline",
                  size: "sm",
                  className: "justify-start h-auto py-2",
                  onClick: () => handleSelectEndpoint(endpoint),
                },
                React.createElement(
                  "div",
                  { className: "text-left" },
                  React.createElement(
                    "div",
                    { className: "flex items-center" },
                    React.createElement(
                      Badge,
                      {
                        variant: "outline",
                        className: `mr-2 ${getMethodColor(endpoint.method)}`,
                      },
                      endpoint.method,
                    ),
                    React.createElement("span", null, endpoint.name),
                  ),
                  React.createElement(
                    "p",
                    { className: "text-xs text-gray-500 mt-1" },
                    endpoint.description,
                  ),
                ),
              ),
            ),
          ),

          // Selected endpoint details
          selectedEndpoint && [
            React.createElement(Separator, { key: "separator" }),
            React.createElement(
              "div",
              { key: "details", className: "space-y-4" },
              // Endpoint details
              React.createElement(
                "div",
                null,
                React.createElement(
                  "h3",
                  { className: "text-sm font-medium mb-1" },
                  t("Endpoint Details"),
                ),
                React.createElement(
                  "div",
                  { className: "bg-gray-50 p-3 rounded-md text-sm" },
                  React.createElement(
                    "div",
                    { className: "grid grid-cols-3 gap-2" },
                    React.createElement(
                      "div",
                      null,
                      React.createElement(
                        "span",
                        { className: "text-xs text-gray-500" },
                        t("Method") + ":",
                      ),
                      React.createElement(
                        Badge,
                        {
                          variant: "outline",
                          className: `ml-2 ${getMethodColor(selectedEndpoint.method)}`,
                        },
                        selectedEndpoint.method,
                      ),
                    ),
                    React.createElement(
                      "div",
                      { className: "col-span-2" },
                      React.createElement(
                        "span",
                        { className: "text-xs text-gray-500" },
                        t("Path") + ":",
                      ),
                      React.createElement(
                        "code",
                        {
                          className:
                            "ml-2 text-xs bg-gray-100 px-1 py-0.5 rounded",
                        },
                        selectedEndpoint.path,
                      ),
                    ),
                  ),
                ),
              ),

              // Request body section
              (selectedEndpoint.method === "POST" ||
                selectedEndpoint.method === "PUT") &&
                React.createElement(
                  "div",
                  null,
                  React.createElement(
                    Label,
                    { htmlFor: "requestBody", className: "text-sm" },
                    t("Request Body") + " (JSON)",
                  ),
                  React.createElement("textarea", {
                    id: "requestBody",
                    value: requestBody,
                    onChange: (e) => setRequestBody(e.target.value),
                    className:
                      "w-full h-32 mt-1 px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-md font-mono",
                  }),
                ),

              // Send request button
              React.createElement(
                Button,
                {
                  onClick: handleSendRequest,
                  disabled: loading,
                  className: "w-full",
                },
                loading
                  ? [
                      React.createElement(Loader2, {
                        key: "loader",
                        className: "mr-2 h-4 w-4 animate-spin",
                      }),
                      t("Sending..."),
                    ]
                  : [
                      React.createElement(Send, {
                        key: "send",
                        className: "mr-2 h-4 w-4",
                      }),
                      t("Send Request"),
                    ],
              ),
            ),
          ],
        ),

        // Custom Tab Content
        React.createElement(
          TabsContent,
          { value: "custom", className: "p-4 space-y-4" },
          React.createElement(
            "div",
            { className: "space-y-4" },
            // Method and path inputs
            React.createElement(
              "div",
              { className: "grid grid-cols-3 gap-4" },
              React.createElement(
                "div",
                null,
                React.createElement(Label, { htmlFor: "method" }, t("Method")),
                React.createElement(
                  "select",
                  {
                    id: "method",
                    className:
                      "w-full h-10 mt-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md",
                  },
                  ["GET", "POST", "PUT", "DELETE"].map((method) =>
                    React.createElement(
                      "option",
                      { key: method, value: method },
                      method,
                    ),
                  ),
                ),
              ),
              React.createElement(
                "div",
                { className: "col-span-2" },
                React.createElement(Label, { htmlFor: "path" }, t("Path")),
                React.createElement(Input, {
                  id: "path",
                  placeholder: "e.g., guests",
                  className: "mt-1",
                }),
              ),
            ),

            // Custom request body
            React.createElement(
              "div",
              null,
              React.createElement(
                Label,
                { htmlFor: "customRequestBody" },
                t("Request Body") + " (JSON)",
              ),
              React.createElement("textarea", {
                id: "customRequestBody",
                className:
                  "w-full h-32 mt-1 px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-md font-mono",
                placeholder: '{\n  "key": "value"\n}',
              }),
            ),

            // Send custom request button
            React.createElement(
              Button,
              {
                onClick: handleCustomRequest,
                disabled: loading,
                className: "w-full",
              },
              loading
                ? [
                    React.createElement(Loader2, {
                      key: "loader",
                      className: "mr-2 h-4 w-4 animate-spin",
                    }),
                    t("Sending..."),
                  ]
                : [
                    React.createElement(Send, {
                      key: "send",
                      className: "mr-2 h-4 w-4",
                    }),
                    t("Send Custom Request"),
                  ],
            ),
          ),
        ),
      ),
    ),

    // Response/Error Footer
    (response || error) &&
      React.createElement(
        CardFooter,
        { className: "flex flex-col items-stretch p-0" },
        React.createElement(
          "div",
          {
            className:
              "p-3 border-t border-gray-200 bg-gray-50 flex justify-between items-center",
          },
          React.createElement(
            "h3",
            { className: "text-sm font-medium flex items-center" },
            error
              ? [
                  React.createElement(X, {
                    key: "error-icon",
                    className: "h-4 w-4 text-red-500 mr-1",
                  }),
                  t("Error"),
                ]
              : [
                  React.createElement(Check, {
                    key: "success-icon",
                    className: "h-4 w-4 text-green-500 mr-1",
                  }),
                  t("Response"),
                ],
          ),
          React.createElement(
            Button,
            {
              variant: "ghost",
              size: "sm",
              onClick: () => {
                setResponse(null);
                setError(null);
              },
              className: "h-7 px-2",
            },
            React.createElement(RefreshCw, { className: "h-3 w-3" }),
          ),
        ),
        React.createElement(
          "div",
          {
            className:
              "p-3 max-h-64 overflow-auto bg-gray-900 text-gray-100 rounded-b-md",
          },
          error
            ? React.createElement(
                "div",
                { className: "text-red-400 text-sm font-mono" },
                error,
              )
            : React.createElement(
                "pre",
                { className: "text-xs font-mono whitespace-pre-wrap" },
                JSON.stringify(response, null, 2),
              ),
        ),
      ),
  );
};
