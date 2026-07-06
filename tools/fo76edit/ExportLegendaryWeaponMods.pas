unit ExportLegendaryWeaponMods;

// Igual que ExportGroup, pero FILTRA: solo vuelca los OMOD cuyo editor_id
// contiene "Legendary_Weapon" (los mods legendarios de arma de las 4 estrellas
// — 1/2/3/4★). Se aplica al grupo "Object Modification" ENTERO y descarta solo
// solo los legendarios de arma, así no hay que filtrar a mano en la UI.
//
// La estrella viene en el editor_id (..._Legendary_Weapon<N>_...) y en el
// Attach Point (ap_Legendary<N>). El campo DESC trae el texto del efecto CON el
// número real (ej. "25 de daño durante 5 segundos"), y la propiedad
// Enchantments enlaza al ENCH ya extraído en la Tanda 1. El Walk vuelca todo
// eso; el filtrado fino (descartar los _PARENT_ y quedarnos con el efecto) lo
// hace Claude al procesar.
//
// Salida: group_export.txt (renombrar a algo como legendary_weapon_mods.txt).

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
  eid := '';  try eid := GetElementEditValues(e, 'EDID'); except end;

  // FILTRO: solo mods legendarios de arma. Descarta los miles de mods normales.
  if Pos('Legendary_Weapon', eid) = 0 then begin
    Result := 0;
    Exit;
  end;

  sig := '';  try sig  := Signature(e); except end;
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
