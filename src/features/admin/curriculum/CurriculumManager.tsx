import React, { useState } from "react";
import { Card, Button, Input, Select, PageHeader, EmptyState, Modal } from "../../../app/components/ui";
import { getCurriculum, addCurriculumItem, updateCurriculumItem, deleteCurriculumItem } from "../../../store";
import type { CurriculumItem } from "../../../types";

export function CurriculumManager() {
  const [items, setItems] = useState<CurriculumItem[]>(getCurriculum());
  const [courseFilter, setCourseFilter] = useState("BSIT");
  const [yearFilter, setYearFilter] = useState("1");
  const [modalOpen, setModalOpen] = useState(false);

  const [subjectCode, setSubjectCode] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [units, setUnits] = useState(3);
  const [semester, setSemester] = useState("First Semester");

  const filteredItems = items.filter(
    (i) => i.course === courseFilter && String(i.year_level) === String(yearFilter)
  );

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    addCurriculumItem({
      course: courseFilter,
      year_level: yearFilter,
      semester,
      subject_code: subjectCode,
      subject_name: subjectName,
      units,
    });
    setItems(getCurriculum());
    setModalOpen(false);
    setSubjectCode("");
    setSubjectName("");
  };

  const handleDelete = (id: string) => {
    deleteCurriculumItem(id);
    setItems(getCurriculum());
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageHeader title="Curriculum Management" subtitle="Manage courses, year levels, and subject curriculum items." />
        <Button onClick={() => setModalOpen(true)} className="bg-[#800000] text-white font-bold">
          + Add Curriculum Subject
        </Button>
      </div>

      <div className="flex gap-4 mb-6">
        <Select
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          options={[
            { value: "BSIT", label: "BSIT" },
            { value: "BSCS", label: "BSCS" },
            { value: "BSEMC", label: "BSEMC" },
          ]}
          className="w-40"
        />
        <Select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          options={[
            { value: "1", label: "Year 1" },
            { value: "2", label: "Year 2" },
            { value: "3", label: "Year 3" },
            { value: "4", label: "Year 4" },
          ]}
          className="w-40"
        />
      </div>

      <Card className="p-4">
        {filteredItems.length ? (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <th className="py-2.5">Code</th>
                <th className="py-2.5">Subject Name</th>
                <th className="py-2.5">Semester</th>
                <th className="py-2.5">Units</th>
                <th className="py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 last:border-0 font-medium">
                  <td className="py-3 font-bold text-slate-900">{item.subject_code}</td>
                  <td className="py-3 text-slate-700">{item.subject_name}</td>
                  <td className="py-3 text-slate-500">{item.semester}</td>
                  <td className="py-3 text-slate-700">{item.units}</td>
                  <td className="py-3 text-right">
                    <Button variant="ghost" size="xs" onClick={() => handleDelete(item.id)} className="text-red-600">
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState title="No curriculum subjects found for selected filter." />
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Curriculum Subject">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Subject Code</label>
            <Input required value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)} placeholder="ITE 101" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Subject Name</label>
            <Input required value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="Introduction to Computing" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Units</label>
              <Input type="number" required value={units} onChange={(e) => setUnits(parseInt(e.target.value) || 3)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Semester</label>
              <Select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                options={[
                  { value: "First Semester", label: "First Semester" },
                  { value: "Second Semester", label: "Second Semester" },
                ]}
              />
            </div>
          </div>
          <Button type="submit" className="w-full bg-[#800000] text-white font-bold">Add Subject</Button>
        </form>
      </Modal>
    </div>
  );
}
