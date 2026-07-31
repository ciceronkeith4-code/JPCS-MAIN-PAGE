import React, { useState } from "react";
import { Card, Button, Input, Select, PageHeader, EmptyState, Modal } from "../../../app/components/ui";
import { getCurriculum, addCurriculumItem, deleteCurriculumItem } from "../../../store";
import type { CurriculumItem } from "../../../types";

function getSubjectBadgeTheme(subjectCode: string) {
  const code = (subjectCode || "").toUpperCase().trim();
  if (code.includes("ITE") || code.includes("ITP") || code.includes("CS")) {
    return "bg-emerald-50 text-emerald-900 border-emerald-200/80";
  }
  if (code.includes("GEC") || code.includes("THEO") || code.includes("REL") || code.includes("RF")) {
    return "bg-indigo-50 text-indigo-900 border-indigo-200/80";
  }
  if (code.includes("TRACK") || code.includes("ELECTIVE") || code.includes("IPE")) {
    return "bg-purple-50 text-purple-900 border-purple-200/80";
  }
  if (code.includes("CAPSTONE") || code.includes("PRACTICUM") || code.includes("128") || code.includes("129")) {
    return "bg-amber-50 text-amber-950 border-amber-300/80";
  }
  return "bg-sky-50 text-sky-900 border-sky-200/80";
}

function getBlockBadge(block?: string) {
  const b = (block || "A").toUpperCase();
  if (b === "B") return <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-100 text-purple-900 border border-purple-300">BLK B</span>;
  if (b === "AB") return <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-950 border border-amber-300">BLK AB</span>;
  return <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-900 border border-blue-300">BLK A</span>;
}

export function CurriculumManager() {
  const [items, setItems] = useState<CurriculumItem[]>(getCurriculum());
  const [courseFilter, setCourseFilter] = useState("BSIT");
  const [yearFilter, setYearFilter] = useState("1");
  const [blockFilter, setBlockFilter] = useState<"all" | "A" | "B" | "AB">("all");
  const [modalOpen, setModalOpen] = useState(false);

  const [subjectCode, setSubjectCode] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [units, setUnits] = useState(3);
  const [semester, setSemester] = useState("First Semester");
  const [block, setBlock] = useState<"A" | "B" | "AB">("A");

  const filteredItems = items.filter((i) => {
    const courseMatch = i.course === courseFilter;
    const yearMatch = String(i.year_level) === String(yearFilter);
    const itemBlock = (i.block || "A").toUpperCase();
    const blockMatch = blockFilter === "all" || itemBlock === blockFilter;
    return courseMatch && yearMatch && blockMatch;
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    addCurriculumItem({
      course: courseFilter,
      year_level: yearFilter,
      semester,
      block,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <PageHeader title="Curriculum Management" subtitle="Manage courses, year levels, block sections, and curriculum subjects." />
        <Button onClick={() => setModalOpen(true)} className="bg-[#800000] text-white font-bold shrink-0">
          + Add Curriculum Subject
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Course:</span>
          <Select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            options={[
              { value: "BSIT", label: "BSIT" },
              { value: "BSCS", label: "BSCS" },
              { value: "BSEMC", label: "BSEMC" },
            ]}
            className="w-32"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Year:</span>
          <Select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            options={[
              { value: "1", label: "Year 1" },
              { value: "2", label: "Year 2" },
              { value: "3", label: "Year 3" },
              { value: "4", label: "Year 4" },
            ]}
            className="w-32"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Block:</span>
          <Select
            value={blockFilter}
            onChange={(e) => setBlockFilter(e.target.value as any)}
            options={[
              { value: "all", label: "All Blocks (A, B, AB)" },
              { value: "A", label: "BLK A" },
              { value: "B", label: "BLK B" },
              { value: "AB", label: "BLK AB" },
            ]}
            className="w-48"
          />
        </div>
      </div>

      <Card className="p-4 overflow-hidden">
        {filteredItems.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider">
                  <th className="py-3 px-3">Block</th>
                  <th className="py-3 px-3">Subject Code</th>
                  <th className="py-3 px-3">Subject Name</th>
                  <th className="py-3 px-3">Semester</th>
                  <th className="py-3 px-3 text-center">Units</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const theme = getSubjectBadgeTheme(item.subject_code);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors font-medium">
                      <td className="py-3 px-3 whitespace-nowrap">{getBlockBadge(item.block)}</td>
                      <td className="py-3 px-3 font-bold whitespace-nowrap">
                        <span className={`inline-block px-2 py-1 rounded border text-xs font-mono font-extrabold ${theme}`}>
                          {item.subject_code}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-900 font-bold">{item.subject_name}</td>
                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap">{item.semester}</td>
                      <td className="py-3 px-3 text-center font-bold text-slate-800">{item.units}</td>
                      <td className="py-3 px-3 text-right">
                        <Button variant="ghost" size="xs" onClick={() => handleDelete(item.id)} className="text-red-600 font-bold hover:bg-red-50">
                          Delete
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No curriculum subjects found for selected course, year, and block filter." />
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Curriculum Subject">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Subject Code</label>
              <Input required value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)} placeholder="ITE 101" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Block Section</label>
              <Select
                value={block}
                onChange={(e) => setBlock(e.target.value as any)}
                options={[
                  { value: "A", label: "BLK A" },
                  { value: "B", label: "BLK B" },
                  { value: "AB", label: "BLK AB (Combined)" },
                ]}
              />
            </div>
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
