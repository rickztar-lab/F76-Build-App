unit ExportGroup;

// Exportador GENÉRICO: se aplica a CUALQUIER grupo de registros del ESM y
// vuelca, por cada registro, su editor_id + nombre + todos sus campos hoja
// (path completo = valor), separados por TAB para poder parsearlos. No hay
// que saber de antemano los nombres de campo — camina todos los elementos.
// Salida: group_export.txt (renombrar por grupo antes de pasarlo).
//
// Para grupos grandes (Race, Non-Player Character): NO aplicar al grupo
// entero de una — filtrá primero por nombre (caja "Filter by Name") o
// seleccioná unos pocos registros, o el archivo sale gigante.

var
  sl: TStringList;

function SafeLeaf(e: IInterface): string;
begin
  try Result := GetEditValue(e); except Result := ''; end;
end;

function SafeName(e: IInterface): string;
begin
  try Result := Name(e); except Result := ''; end;
end;

procedure Walk(e: IInterface; prefix: string; depth: integer);
var
  i, count: integer;
  child: IInterface;
begin
  if depth > 6 then begin
    sl.Add(prefix + #9 + '(corte de profundidad)');
    Exit;
  end;
  count := 0;
  try count := ElementCount(e); except end;
  if count = 0 then begin
    // Elemento hoja: una sola línea "path<TAB>valor" (sin duplicar).
    sl.Add(prefix + #9 + SafeLeaf(e));
    Exit;
  end;
  for i := 0 to count - 1 do begin
    child := nil;
    try child := ElementByIndex(e, i); except end;
    if not Assigned(child) then Continue;
    Walk(child, prefix + '\' + SafeName(child), depth + 1);
  end;
end;

function Initialize: integer;
begin
  sl := TStringList.Create;
  Result := 0;
end;

function Process(e: IInterface): integer;
var
  sig, eid, full: string;
begin
  sig := '';  try sig  := Signature(e); except end;
  eid := '';  try eid  := GetElementEditValues(e, 'EDID'); except end;
  full := ''; try full := GetElementEditValues(e, 'FULL'); except end;
  sl.Add('### ' + sig + ' | ' + eid + ' | ' + full);
  Walk(e, '', 0);
  sl.Add('');
  Result := 0;
end;

function Finalize: integer;
begin
  sl.SaveToFile('group_export.txt');
  sl.Free;
  Result := 0;
end;

end.
