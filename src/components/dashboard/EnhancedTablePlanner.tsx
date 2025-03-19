import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TouchBackend } from "react-dnd-touch-backend";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DroppableTableArea } from "./DroppableTableArea";
import { DroppableGuestArea } from "./DroppableGuestArea";
import { tablesApi, guestsApi, Guest, Table } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { useTranslation } from "@/lib/useTranslation";
import {
  Loader2,
  Plus,
  Trash2,
  Users,
  Sparkles,
  Download,
  Printer,
} from "lucide-react";
import PrintableTableAssignments from "./PrintableTableAssignments";
import { useReactToPrint } from "react-to-print";

// Types
interface TableFormData {
  name: string;
  shape: "round" | "rectangle" | "oval";
  capacity: number;
}

interface EnhancedTablePlannerProps {
  initialTables?: Table[];
  initialGuests?: Guest[];
}

// Memoized UI components for better performance
const LoadingSpinner = memo(() => (
  <div className="flex justify-center items-center h-64">
    <Loader2 className="h-8 w-8 text-rose-600 animate-spin" />
  </div>
));

const EmptyTableState = memo(({ t }: { t: (key: string) => string }) => (
  <div className="text-center py-12 border-2 border-dashed rounded-lg">
    <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
    <h3 className="text-lg font-medium text-gray-900 mb-1">
      {t("tablePlanner.noTables")}
    </h3>
    <p className="text-sm text-gray-500">
      {t("tablePlanner.createFirstTable")}
    </p>
  </div>
));

const AIAssistantCard = memo(
  ({
    t,
    aiLoading,
    onAISeating,
  }: {
    t: (key: string) => string;
    aiLoading: boolean;
    onAISeating: () => void;
  }) => (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center">
          <Sparkles className="h-4 w-4 mr-2 text-blue-600" />
          {t("tablePlanner.aiAssistant")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-gray-600 mb-3">
          {t("tablePlanner.aiAssistantDescription")}
        </p>
        <Button
          size="sm"
          className="w-full bg-blue-600 hover:bg-blue-700"
          onClick={onAISeating}
          disabled={aiLoading}
        >
          {aiLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          {aiLoading
            ? t("tablePlanner.aiProcessing")
            : t("tablePlanner.aiAssignSeats")}
        </Button>
      </CardContent>
    </Card>
  ),
);

// Table form component
const TableForm = memo(
  ({
    tableForm,
    handleTableFormChange,
    handleCreateTable,
    saving,
    t,
  }: {
    tableForm: TableFormData;
    handleTableFormChange: (
      field: keyof TableFormData,
      value: string | number,
    ) => void;
    handleCreateTable: () => void;
    saving: boolean;
    t: (key: string) => string;
  }) => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {t("tablePlanner.addTable")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <Label htmlFor="tableName">{t("tablePlanner.tableName")}</Label>
            <Input
              id="tableName"
              value={tableForm.name}
              onChange={(e) => handleTableFormChange("name", e.target.value)}
              placeholder={t("tablePlanner.tableNamePlaceholder")}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="tableShape">{t("tablePlanner.tableShape")}</Label>
            <Select
              value={tableForm.shape}
              onValueChange={(value) =>
                handleTableFormChange(
                  "shape",
                  value as "round" | "rectangle" | "oval",
                )
              }
            >
              <SelectTrigger id="tableShape" className="mt-1">
                <SelectValue placeholder={t("tablePlanner.selectShape")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="round">{t("tablePlanner.round")}</SelectItem>
                <SelectItem value="rectangle">
                  {t("tablePlanner.rectangle")}
                </SelectItem>
                <SelectItem value="oval">{t("tablePlanner.oval")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="tableCapacity">{t("tablePlanner.capacity")}</Label>
            <Input
              id="tableCapacity"
              type="number"
              min={1}
              max={20}
              value={tableForm.capacity}
              onChange={(e) =>
                handleTableFormChange("capacity", parseInt(e.target.value) || 8)
              }
              className="mt-1"
            />
          </div>
        </div>
        <Button
          onClick={handleCreateTable}
          disabled={saving}
          className="mt-4 w-full sm:w-auto"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          {t("tablePlanner.createTable")}
        </Button>
      </CardContent>
    </Card>
  ),
);

// Guest table component
const GuestTable = memo(
  ({
    guests,
    tables,
    handleRemoveGuest,
    handleAssignGuest,
    saving,
    t,
  }: {
    guests: Guest[];
    tables: Table[];
    handleRemoveGuest: (guestId: string) => void;
    handleAssignGuest: (guestId: string, tableName: string) => void;
    saving: boolean;
    t: (key: string) => string;
  }) => (
    <table className="w-full text-sm">
      <thead className="text-xs text-gray-700 uppercase bg-gray-50">
        <tr>
          <th className="px-4 py-2 text-left">{t("common.name")}</th>
          <th className="px-4 py-2 text-left">{t("common.email")}</th>
          <th className="px-4 py-2 text-left">
            {t("tablePlanner.tableAssignment")}
          </th>
          <th className="px-4 py-2 text-center">{t("common.actions")}</th>
        </tr>
      </thead>
      <tbody>
        {guests.map((guest) => (
          <tr key={guest.id} className="border-b hover:bg-gray-50">
            <td className="px-4 py-2">{guest.name}</td>
            <td className="px-4 py-2 text-gray-500">{guest.email}</td>
            <td className="px-4 py-2">
              {guest.tableAssignment ? (
                <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                  {guest.tableAssignment}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-gray-500">
                  {t("tablePlanner.unassigned")}
                </Badge>
              )}
            </td>
            <td className="px-4 py-2 text-center">
              {guest.tableAssignment ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleRemoveGuest(guest.id)}
                  disabled={saving}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : (
                <Select
                  onValueChange={(tableName) =>
                    handleAssignGuest(guest.id, tableName)
                  }
                  disabled={saving || tables.length === 0}
                >
                  <SelectTrigger className="h-8 w-[130px]">
                    <SelectValue placeholder={t("tablePlanner.assignTo")} />
                  </SelectTrigger>
                  <SelectContent>
                    {tables.map((table) => (
                      <SelectItem key={table.id} value={table.name}>
                        {table.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
);

// Main component with optimized structure
export function EnhancedTablePlanner({
  initialTables = [],
  initialGuests = [],
}: EnhancedTablePlannerProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tables, setTables] = useState<Table[]>(initialTables);
  const [guests, setGuests] = useState<Guest[]>(initialGuests);
  const [unassignedGuests, setUnassignedGuests] = useState<Guest[]>([]);
  const [activeTab, setActiveTab] = useState("tables");
  const [tableForm, setTableForm] = useState<TableFormData>({
    name: "",
    shape: "round",
    capacity: 8,
  });
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const printRef = React.useRef<HTMLDivElement>(null);

  // Memoized values
  const assignedGuestsCount = useMemo(
    () => guests.filter((g) => g.tableAssignment).length,
    [guests],
  );

  // Handle printing
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: "Table Assignments",
  });

  // Check if we're on a mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Load tables and guests
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // If we have initial data, use it
        if (initialTables.length > 0 && initialGuests.length > 0) {
          setTables(initialTables);
          setGuests(initialGuests);
          // Filter unassigned guests
          setUnassignedGuests(
            initialGuests.filter((guest) => !guest.tableAssignment),
          );
          return;
        }

        // Otherwise load from API
        const [tablesData, guestsData] = await Promise.all([
          tablesApi.getTables(),
          guestsApi.getGuests(),
        ]);

        setTables(tablesData);
        setGuests(guestsData);

        // Filter unassigned guests
        setUnassignedGuests(
          guestsData.filter((guest) => !guest.tableAssignment),
        );
      } catch (error) {
        console.error("Error loading table planner data:", error);
        toast({
          title: t("common.error"),
          description: t("tablePlanner.loadError"),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [initialTables, initialGuests, t, toast]);

  // Form handlers
  const handleTableFormChange = useCallback(
    (field: keyof TableFormData, value: string | number) => {
      setTableForm((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    [],
  );

  // Create a new table
  const handleCreateTable = useCallback(async () => {
    if (!tableForm.name) {
      toast({
        title: t("common.error"),
        description: t("tablePlanner.nameRequired"),
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const newTable = await tablesApi.createTable({
        name: tableForm.name,
        shape: tableForm.shape,
        capacity: tableForm.capacity,
      });

      if (newTable) {
        setTables((prev) => [...prev, newTable]);
        // Reset form
        setTableForm((prev) => ({ ...prev, name: "" }));
        toast({
          title: t("common.success"),
          description: t("tablePlanner.tableCreated"),
        });
      }
    } catch (error) {
      console.error("Error creating table:", error);
      toast({
        title: t("common.error"),
        description: t("tablePlanner.createError"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [tableForm, t, toast]);

  // Delete a table
  const handleDeleteTable = useCallback(
    async (tableId: string) => {
      try {
        setSaving(true);
        const success = await tablesApi.deleteTable(tableId);

        if (success) {
          // Find guests assigned to this table
          const tableToDelete = tables.find((table) => table.id === tableId);
          if (tableToDelete) {
            // Update guests that were assigned to this table
            const guestsToUpdate = guests.filter(
              (guest) => guest.tableAssignment === tableToDelete.name,
            );

            // Move these guests back to unassigned
            const updatedGuests = [...guests];
            const updatePromises = guestsToUpdate.map(async (guest) => {
              await tablesApi.removeGuestFromTable(guest.id);
              const index = updatedGuests.findIndex((g) => g.id === guest.id);
              if (index >= 0) {
                updatedGuests[index] = {
                  ...updatedGuests[index],
                  tableAssignment: undefined,
                };
              }
            });

            await Promise.all(updatePromises);
            setGuests(updatedGuests);
            setUnassignedGuests((prev) => [...prev, ...guestsToUpdate]);
          }

          // Remove the table from state
          setTables((prev) => prev.filter((table) => table.id !== tableId));
          toast({
            title: t("common.success"),
            description: t("tablePlanner.tableDeleted"),
          });
        }
      } catch (error) {
        console.error("Error deleting table:", error);
        toast({
          title: t("common.error"),
          description: t("tablePlanner.deleteError"),
          variant: "destructive",
        });
      } finally {
        setSaving(false);
      }
    },
    [tables, guests, t, toast],
  );

  // Assign a guest to a table
  const handleAssignGuest = useCallback(
    async (guestId: string, tableName: string) => {
      try {
        setSaving(true);
        const success = await tablesApi.assignGuestToTable(guestId, tableName);

        if (success) {
          // Update local state
          setGuests((prev) =>
            prev.map((guest) =>
              guest.id === guestId
                ? { ...guest, tableAssignment: tableName }
                : guest,
            ),
          );

          setUnassignedGuests((prev) =>
            prev.filter((guest) => guest.id !== guestId),
          );

          // Update tables with new guest assignments
          setTables((prev) =>
            prev.map((table) =>
              table.name === tableName
                ? {
                    ...table,
                    guests: [...table.guests, guestId],
                  }
                : table,
            ),
          );
        }
      } catch (error) {
        console.error("Error assigning guest to table:", error);
        toast({
          title: t("common.error"),
          description: t("tablePlanner.assignError"),
          variant: "destructive",
        });
      } finally {
        setSaving(false);
      }
    },
    [t, toast],
  );

  // Remove a guest from a table
  const handleRemoveGuest = useCallback(
    async (guestId: string) => {
      try {
        setSaving(true);
        const success = await tablesApi.removeGuestFromTable(guestId);

        if (success) {
          // Find the guest
          const guest = guests.find((g) => g.id === guestId);
          if (guest) {
            // Update local state
            setGuests((prev) =>
              prev.map((g) =>
                g.id === guestId ? { ...g, tableAssignment: undefined } : g,
              ),
            );

            setUnassignedGuests((prev) => [
              ...prev,
              { ...guest, tableAssignment: undefined },
            ]);

            // Update tables
            setTables((prev) =>
              prev.map((table) => ({
                ...table,
                guests: table.guests.filter((id) => id !== guestId),
              })),
            );
          }
        }
      } catch (error) {
        console.error("Error removing guest from table:", error);
        toast({
          title: t("common.error"),
          description: t("tablePlanner.removeError"),
          variant: "destructive",
        });
      } finally {
        setSaving(false);
      }
    },
    [guests, t, toast],
  );

  // Update table positions with debounce
  const handleUpdateTablePosition = useCallback(
    async (tableId: string, x: number, y: number) => {
      try {
        const tableToUpdate = tables.find((table) => table.id === tableId);
        if (tableToUpdate) {
          // Update local state immediately for smooth UX
          setTables((prev) =>
            prev.map((table) =>
              table.id === tableId
                ? { ...table, positionX: x, positionY: y }
                : table,
            ),
          );

          // Update in the backend
          await tablesApi.updateTable({
            ...tableToUpdate,
            positionX: x,
            positionY: y,
          });
        }
      } catch (error) {
        console.error("Error updating table position:", error);
        // Don't show toast for position updates to avoid spamming
      }
    },
    [tables],
  );

  // AI Seating Assistant
  const handleAISeating = useCallback(async () => {
    setAiLoading(true);
    try {
      // Simulate AI processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // This is a simplified algorithm that would be replaced by a real AI solution
      // It distributes guests evenly across tables based on capacity
      const availableTables = [...tables].filter(
        (table) => table.guests.length < table.capacity,
      );
      const guestsToAssign = [...unassignedGuests];

      if (availableTables.length === 0) {
        toast({
          title: t("common.error"),
          description: t("tablePlanner.noAvailableTables"),
          variant: "destructive",
        });
        return;
      }

      // Sort tables by available capacity
      availableTables.sort(
        (a, b) => a.capacity - a.guests.length - (b.capacity - b.guests.length),
      );

      // Assign guests to tables
      const assignmentPromises = [];
      for (const guest of guestsToAssign) {
        // Find table with available space
        const targetTable = availableTables.find(
          (table) => table.guests.length < table.capacity,
        );

        if (targetTable) {
          // Queue assignment
          assignmentPromises.push(
            handleAssignGuest(guest.id, targetTable.name),
          );

          // Update available space in the table (optimistic update)
          const tableIndex = availableTables.findIndex(
            (t) => t.id === targetTable.id,
          );
          if (tableIndex >= 0) {
            availableTables[tableIndex] = {
              ...availableTables[tableIndex],
              guests: [...availableTables[tableIndex].guests, guest.id],
            };
          }
        }
      }

      // Execute all assignments in parallel
      await Promise.all(assignmentPromises);

      toast({
        title: t("common.success"),
        description: t("tablePlanner.aiSeatingComplete"),
      });
    } catch (error) {
      console.error("Error with AI seating:", error);
      toast({
        title: t("common.error"),
        description: t("tablePlanner.aiSeatingError"),
        variant: "destructive",
      });
    } finally {
      setAiLoading(false);
      setShowAIAssistant(false);
    }
  }, [tables, unassignedGuests, handleAssignGuest, t, toast]);

  // Export table assignments
  const handleExport = useCallback(() => {
    try {
      // Create CSV content
      let csvContent = "Guest Name,Email,Table Assignment\n";

      guests.forEach((guest) => {
        csvContent += `"${guest.name}","${guest.email}","${guest.tableAssignment || "Unassigned"}"
`;
      });

      // Create download link
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "table_assignments.csv");
      document.body.appendChild(link);

      // Trigger download and clean up
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url); // Clean up to avoid memory leaks
    } catch (error) {
      console.error("Error exporting table assignments:", error);
      toast({
        title: t("common.error"),
        description: t("tablePlanner.exportError"),
        variant: "destructive",
      });
    }
  }, [guests, t, toast]);

  if (loading) {
    return <LoadingSpinner />;
  }

  // Render the appropriate backend based on device type
  const DndBackend = isMobile ? TouchBackend : HTML5Backend;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">
            {t("tablePlanner.title")}
          </h2>
          <p className="text-sm text-gray-500">
            {t("tablePlanner.description")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="text-xs"
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            {t("tablePlanner.export")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="text-xs"
          >
            <Printer className="h-3.5 w-3.5 mr-1" />
            {t("tablePlanner.print")}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tables">{t("tablePlanner.tables")}</TabsTrigger>
          <TabsTrigger value="guests">{t("tablePlanner.guests")}</TabsTrigger>
        </TabsList>

        <TabsContent value="tables" className="space-y-4 pt-4">
          <TableForm
            tableForm={tableForm}
            handleTableFormChange={handleTableFormChange}
            handleCreateTable={handleCreateTable}
            saving={saving}
            t={t}
          />

          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-1/3 space-y-4">
              <h3 className="text-sm font-medium">
                {t("tablePlanner.unassignedGuests")}
                <Badge variant="outline" className="ml-2">
                  {unassignedGuests.length}
                </Badge>
              </h3>

              <DndProvider backend={DndBackend}>
                <DroppableGuestArea
                  unassignedGuests={unassignedGuests}
                  onGuestRemove={handleRemoveGuest}
                />
              </DndProvider>

              {unassignedGuests.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={() => setShowAIAssistant(true)}
                >
                  <Sparkles className="h-4 w-4" />
                  {t("tablePlanner.useAIAssistant")}
                </Button>
              )}

              {showAIAssistant && (
                <AIAssistantCard
                  t={t}
                  aiLoading={aiLoading}
                  onAISeating={handleAISeating}
                />
              )}
            </div>

            <div className="w-full md:w-2/3">
              <h3 className="text-sm font-medium mb-4">
                {t("tablePlanner.tableLayout")}
                <Badge variant="outline" className="ml-2">
                  {tables.length}
                </Badge>
              </h3>

              <DndProvider backend={DndBackend}>
                <DroppableTableArea
                  tables={tables}
                  guests={guests}
                  onDeleteTable={handleDeleteTable}
                  onAssignGuest={handleAssignGuest}
                  onRemoveGuest={handleRemoveGuest}
                  onUpdateTablePosition={handleUpdateTablePosition}
                />
              </DndProvider>

              {tables.length === 0 && <EmptyTableState t={t} />}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="guests" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("tablePlanner.guestAssignments")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium">
                    {t("tablePlanner.assignedGuests")}
                    <Badge variant="outline" className="ml-2">
                      {assignedGuestsCount}
                    </Badge>
                  </h3>
                  <h3 className="text-sm font-medium">
                    {t("tablePlanner.unassignedGuests")}
                    <Badge variant="outline" className="ml-2">
                      {unassignedGuests.length}
                    </Badge>
                  </h3>
                </div>

                <Separator />

                <div className="max-h-[500px] overflow-y-auto pr-2">
                  <GuestTable
                    guests={guests}
                    tables={tables}
                    handleRemoveGuest={handleRemoveGuest}
                    handleAssignGuest={handleAssignGuest}
                    saving={saving}
                    t={t}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Hidden printable component */}
      <div className="hidden">
        <div ref={printRef}>
          <PrintableTableAssignments tables={tables} guests={guests} />
        </div>
      </div>
    </div>
  );
}
