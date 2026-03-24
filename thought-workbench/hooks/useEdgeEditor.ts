import { useState } from "react";
import { RELATIONS } from "../constants/relations";

export function useEdgeEditor() {
  const [newEdgeFrom, setNewEdgeFrom] = useState("");
  const [newEdgeTo, setNewEdgeTo] = useState("");
  const [newEdgeRelation, setNewEdgeRelation] = useState<string>(RELATIONS[0]);
  const [newEdgeMeaning, setNewEdgeMeaning] = useState("");
  const [newEdgeWeight, setNewEdgeWeight] = useState("1");
  const [newEdgeContradictionType, setNewEdgeContradictionType] = useState("");
  const [newEdgeTransformOp, setNewEdgeTransformOp] = useState("");
  const [edgeMessage, setEdgeMessage] = useState("");

  const resetEdgeForm = () => {
    setNewEdgeFrom("");
    setNewEdgeTo("");
    setNewEdgeMeaning("");
    setNewEdgeWeight("1");
    setNewEdgeContradictionType("");
    setNewEdgeTransformOp("");
  };

  return {
    newEdgeFrom, setNewEdgeFrom,
    newEdgeTo, setNewEdgeTo,
    newEdgeRelation, setNewEdgeRelation,
    newEdgeMeaning, setNewEdgeMeaning,
    newEdgeWeight, setNewEdgeWeight,
    newEdgeContradictionType, setNewEdgeContradictionType,
    newEdgeTransformOp, setNewEdgeTransformOp,
    edgeMessage, setEdgeMessage,
    resetEdgeForm,
  };
}
