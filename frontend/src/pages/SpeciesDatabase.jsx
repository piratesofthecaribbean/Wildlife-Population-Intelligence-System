import React, { useEffect, useState } from "react";
import api from "../services/api";
import { toast } from "react-hot-toast";
import GlassCard from "../components/GlassCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { FaDna, FaPlus, FaSearch, FaTimes } from "react-icons/fa";

export default function SpeciesDatabase() {
  const [species, setSpecies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [groupFilter, setGroupFilter] = useState("ALL");

  const [name, setName] = useState("");
  const [scientificName, setScientificName] = useState("");
  const [conservationStatus, setConservationStatus] = useState("LC");
  const [taxClass, setTaxClass] = useState("Mammalia");
  const [taxOrder, setTaxOrder] = useState("");
  const [family, setFamily] = useState("");
  const [diet, setDiet] = useState("");
  const [habitat, setHabitat] = useState("");
  const [description, setDescription] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const speciesGroups = ["ALL", "Mammals", "Birds", "Reptiles", "Amphibians", "Insects", "Marine Species"];

  async function loadSpecies() {
    try {
      const { data } = await api.get("/species");
      setSpecies(data || []);
    } catch (err) {
      toast.error("Failed to load species database.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSpecies();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await api.post("/species", {
        name,
        scientific_name: scientificName,
        conservation_status: conservationStatus,
        taxonomic_class: taxClass,
        taxonomic_order: taxOrder,
        family,
        diet,
        habitat,
        description,
      });
      toast.success("Species profile registered successfully!");
      setModalOpen(false);
      setName("");
      setScientificName("");
      setConservationStatus("LC");
      setDescription("");
      loadSpecies();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to add species.");
    } finally {
      setFormLoading(false);
    }
  };

  const filteredSpecies = species.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.scientific_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || item.conservation_status === statusFilter;

    let matchesGroup = true;
    if (groupFilter === "Mammals") matchesGroup = (item.taxonomic_class || "").includes("Mammal");
    else if (groupFilter === "Birds")
      matchesGroup =
        (item.taxonomic_class || "").includes("Aves") ||
        item.name.includes("Peacock") ||
        item.name.includes("Bird");
    else if (groupFilter === "Reptiles") matchesGroup = (item.taxonomic_class || "").includes("Reptil");
    else if (groupFilter === "Amphibians") matchesGroup = (item.taxonomic_class || "").includes("Amphib");
    else if (groupFilter === "Insects") matchesGroup = (item.taxonomic_class || "").includes("Insect");
    else if (groupFilter === "Marine Species")
      matchesGroup =
        (item.habitat || "").toLowerCase().includes("marine") ||
        (item.habitat || "").toLowerCase().includes("water");

    return matchesSearch && matchesStatus && matchesGroup;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <div className="h-10 w-10 border-4 border-[#155e3b] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono text-[#355344] font-bold">
          Loading Taxonomic Catalog...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-[#0d261b] flex items-center gap-2.5">
            <FaDna className="text-[#155e3b]" /> Taxonomic Species Registry & IUCN Index
          </h2>
          <p className="text-xs text-[#355344] mt-1">
            Taxonomic classification, IUCN conservation red list categories, feeding niches, and ecosystem habitats.
          </p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-forest-primary text-xs shadow-sm">
          <FaPlus />
          <span>Register New Species</span>
        </button>
      </div>

      {/* Filter Tabs & Search Controls */}
      <GlassCard variant="standard" className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Supported Groups Tabs */}
        <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
          {speciesGroups.map((g) => (
            <button
              key={g}
              onClick={() => setGroupFilter(g)}
              className={`px-3 py-1.5 text-xs font-bold font-mono rounded-xl transition-all ${groupFilter === g
                  ? "bg-[#155e3b] text-white shadow-sm"
                  : "bg-[#f3f7f4] text-[#355344] hover:text-[#0d261b] hover:bg-[#e5efe8]"
                }`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Search & Status Controls */}
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6c8a7b] text-xs" />
            <input
              type="text"
              placeholder="Search taxonomy..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-forest text-xs pl-9 py-1.5"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-forest text-xs py-1.5 px-3 w-auto cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            <option value="CR">Critically Endangered</option>
            <option value="EN">Endangered</option>
            <option value="VU">Vulnerable</option>
            <option value="LC">Least Concern</option>
          </select>
        </div>
      </GlassCard>

      {/* Species Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSpecies.map((sp) => (
          <GlassCard
            key={sp.id}
            variant="interactive"
            className="p-6 flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold text-[#355344] font-mono uppercase tracking-wider">
                  {sp.taxonomic_class || "Mammalia"}
                </span>
                <StatusBadge status={sp.conservation_status} size="sm" />
              </div>
              <h3 className="font-display font-bold text-lg text-[#0d261b]">{sp.name}</h3>
              <p className="text-xs italic text-[#355344] font-medium mb-3">
                {sp.scientific_name}
              </p>
              <p className="text-xs text-[#0d261b] leading-relaxed">{sp.description}</p>
            </div>

            <div className="pt-3 border-t border-[#e5efe8] text-[11px] text-[#355344] font-mono space-y-1">
              <div>Order: <b>{sp.taxonomic_order || "Carnivora"}</b> | Family: <b>{sp.family || "Felidae"}</b></div>
              <div>Diet: <b>{sp.diet || "Carnivore"}</b></div>
              <div>Habitat: <b>{sp.habitat || "Forests & Grasslands"}</b></div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#d6e4dc] relative">
            <div className="flex justify-between items-center pb-4 border-b border-[#e5efe8]">
              <h3 className="font-display font-bold text-lg text-[#0d261b]">
                Add Species to Registry
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-[#4e6b5c] hover:text-[#0d261b] p-1">
                <FaTimes className="text-base" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 mt-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[#0d261b] font-mono">Common Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bengal Tiger"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-forest text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#0d261b] font-mono">Scientific Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Panthera tigris tigris"
                  value={scientificName}
                  onChange={(e) => setScientificName(e.target.value)}
                  className="input-forest text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-[#0d261b] font-mono">IUCN Category</label>
                  <select
                    value={conservationStatus}
                    onChange={(e) => setConservationStatus(e.target.value)}
                    className="input-forest text-xs py-2"
                  >
                    <option value="CR">Critically Endangered</option>
                    <option value="EN">Endangered</option>
                    <option value="VU">Vulnerable</option>
                    <option value="LC">Least Concern</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#0d261b] font-mono">Taxonomic Class</label>
                  <input
                    type="text"
                    value={taxClass}
                    onChange={(e) => setTaxClass(e.target.value)}
                    className="input-forest text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-[#0d261b] font-mono">Order</label>
                  <input type="text" placeholder="e.g. Carnivora" value={taxOrder}
                    onChange={(e) => setTaxOrder(e.target.value)} className="input-forest text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#0d261b] font-mono">Family</label>
                  <input type="text" placeholder="e.g. Felidae" value={family}
                    onChange={(e) => setFamily(e.target.value)} className="input-forest text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-[#0d261b] font-mono">Diet</label>
                  <input type="text" placeholder="e.g. Carnivore" value={diet}
                    onChange={(e) => setDiet(e.target.value)} className="input-forest text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#0d261b] font-mono">Habitat</label>
                  <input type="text" placeholder="e.g. Tropical Forest" value={habitat}
                    onChange={(e) => setHabitat(e.target.value)} className="input-forest text-xs" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#0d261b] font-mono">Description & Ecology</label>
                <textarea
                  rows="3"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-forest text-xs"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full btn-forest-primary py-3 font-bold text-sm shadow-sm"
                >
                  {formLoading ? "Saving..." : "Save Species Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
