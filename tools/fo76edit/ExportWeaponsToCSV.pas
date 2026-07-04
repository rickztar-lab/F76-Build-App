unit ExportWeaponsToCSV;

var
  sl: TStringList;

function Initialize: integer;
begin
  sl := TStringList.Create;
  sl.Add('editor_id,full_name,base_damage,secondary_damage,capacity,ammo_per_shot,attack_delay_seconds,weight,value,has_object_template');
  Result := 0;
end;

function Process(e: IInterface): integer;
var
  editorID, fullName, baseDamage, secondaryDamage, capacity, ammoPerShot, attackDelay, weight, value, hasTemplate: string;
begin
  if Signature(e) <> 'WEAP' then begin
    Result := 0;
    Exit;
  end;

  // Cambio: acceso directo al elemento EDID en vez de la función EditorID(e),
  // que venía devolviendo vacío en las corridas anteriores.
  editorID := GetElementEditValues(e, 'EDID');
  fullName := GetElementEditValues(e, 'FULL');

  baseDamage := GetElementEditValues(e, 'DNAM\Base Damage');
  secondaryDamage := GetElementEditValues(e, 'DNAM\Secondary Damage');
  capacity := GetElementEditValues(e, 'DNAM\Capacity');
  ammoPerShot := GetElementEditValues(e, 'DNAM\Ammo used per shot');
  attackDelay := GetElementEditValues(e, 'DNAM\Attack Delay Seconds');
  weight := GetElementEditValues(e, 'DNAM\Weight');
  value := GetElementEditValues(e, 'DNAM\Value');

  if ElementExists(e, 'OBTS') then
    hasTemplate := 'True'
  else
    hasTemplate := 'False';

  sl.Add(Format('"%s","%s",%s,%s,%s,%s,%s,%s,%s,%s',
    [editorID, fullName, baseDamage, secondaryDamage, capacity, ammoPerShot, attackDelay, weight, value, hasTemplate]));

  Result := 0;
end;

function Finalize: integer;
begin
  sl.SaveToFile('weapons_export.csv');
  sl.Free;
  Result := 0;
end;

end.
