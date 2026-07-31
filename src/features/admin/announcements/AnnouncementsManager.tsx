import React, { useState } from "react";
import { Card, Button, Input, Select, PageHeader, EmptyState, Modal } from "../../../app/components/ui";
import { getAnnouncements, addAnnouncement, updateAnnouncement, deleteAnnouncement } from "../../../store";
import type { Announcement } from "../../../types";

export function AnnouncementsManager() {
  const [announcements, setAnnouncements] = useState<Announcement[]>(getAnnouncements());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Announcement | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");

  const handleOpenAdd = () => {
    setEditingItem(null);
    setTitle("");
    setDescription("");
    setPriority("normal");
    setModalOpen(true);
  };

  const handleOpenEdit = (ann: Announcement) => {
    setEditingItem(ann);
    setTitle(ann.title);
    setDescription(ann.description);
    setPriority(ann.priority);
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateAnnouncement(editingItem.id, { title, description, priority });
    } else {
      addAnnouncement({
        title,
        description,
        priority,
        publish_date: new Date().toISOString().split("T")[0],
      });
    }
    setAnnouncements(getAnnouncements());
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteAnnouncement(id);
    setAnnouncements(getAnnouncements());
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageHeader title="Announcements Management" subtitle="Publish and manage system-wide announcements for students." />
        <Button onClick={handleOpenAdd} className="bg-[#800000] text-white font-bold">
          + New Announcement
        </Button>
      </div>

      <div className="space-y-4">
        {announcements.length ? (
          announcements.map((ann) => (
            <Card key={ann.id} className="p-5 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900">{ann.title}</h3>
                  <span className={`text-[10px] uppercase px-2 py-0.5 rounded font-bold ${
                    ann.priority === "high" ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-700"
                  }`}>
                    {ann.priority}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">{ann.description}</p>
                <p className="text-[10px] text-slate-400 mt-2">Published: {ann.publish_date}</p>
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" size="xs" onClick={() => handleOpenEdit(ann)}>Edit</Button>
                <Button variant="ghost" size="xs" onClick={() => handleDelete(ann.id)} className="text-red-600">Delete</Button>
              </div>
            </Card>
          ))
        ) : (
          <EmptyState title="No announcements found" />
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingItem ? "Edit Announcement" : "New Announcement"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Title</label>
            <Input required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-300 p-3 text-xs focus:ring-[#800000]/20 focus:border-[#800000]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
            <Select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              options={[
                { value: "low", label: "Low Priority" },
                { value: "normal", label: "Normal Priority" },
                { value: "high", label: "High Priority" },
              ]}
            />
          </div>
          <Button type="submit" className="w-full bg-[#800000] text-white font-bold">Save Announcement</Button>
        </form>
      </Modal>
    </div>
  );
}
