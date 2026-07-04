unit ExportGenericMods;

var
  sl: TStringList;

function SafeGet(e: IInterface; path: string): string;
begin
  try
    Result := GetElementEditValues(e, path);
  except
    Result := '';
  end;
end;

function Initialize: integer;
begin
  sl := TStringList.Create;
  sl.Add('mod_editor_id,mod_full_name,property_index,property_target,function_type,value1,value2,curve_table');
  Result := 0;
end;

function Process(e: IInterface): integer;
var
  editorID, fullName: string;
  propsContainer, prop: IInterface;
  i, count: integer;
  target, func, val1, val2, curveTbl: string;
begin
  if Signature(e) <> 'OMOD' then begin
    Result := 0;
    Exit;
  end;

  editorID := SafeGet(e, 'EDID');
  // Solo nos interesan las plantillas genéricas compartidas, no los cientos
  // de OMODs específicos por arma (ya sabemos que esos solo agregan la
  // keyword de nombrado + heredan estas plantillas via Includes).
  if Pos('_PARENT_mod_WEAPON_GENERIC', editorID) <> 1 then begin
    Result := 0;
    Exit;
  end;

  fullName := SafeGet(e, 'FULL');

  propsContainer := nil;
  try
    propsContainer := ElementByPath(e, 'DATA\Properties');
  except
  end;

  if not Assigned(propsContainer) then begin
    sl.Add(Format('"%s","%s",-1,"NO PROPERTIES ELEMENT FOUND","","","",""', [editorID, fullName]));
    Result := 0;
    Exit;
  end;

  count := 0;
  try
    count := ElementCount(propsContainer);
  except
  end;

  if count = 0 then
    sl.Add(Format('"%s","%s",-1,"ZERO PROPERTIES OR ElementCount FAILED","","","",""', [editorID, fullName]));

  for i := 0 to count - 1 do begin
    prop := nil;
    try
      prop := ElementByIndex(propsContainer, i);
    except
    end;
    if not Assigned(prop) then Continue;

    target := SafeGet(prop, 'Property');
    func := SafeGet(prop, 'Function Type');
    curveTbl := SafeGet(prop, 'Curve Table');

    val1 := SafeGet(prop, 'Value 1 - Float');
    if val1 = '' then val1 := SafeGet(prop, 'Value 1 - FormID');
    if val1 = '' then val1 := SafeGet(prop, 'Value 1 - Int');
    if val1 = '' then val1 := SafeGet(prop, 'Value 1');

    val2 := SafeGet(prop, 'Value 2 - Float');
    if val2 = '' then val2 := SafeGet(prop, 'Value 2 - Int');
    if val2 = '' then val2 := SafeGet(prop, 'Value 2 - FormID');
    if val2 = '' then val2 := SafeGet(prop, 'Value 2');

    sl.Add(Format('"%s","%s",%d,"%s","%s","%s","%s","%s"',
      [editorID, fullName, i, target, func, val1, val2, curveTbl]));
  end;

  Result := 0;
end;

function Finalize: integer;
begin
  sl.SaveToFile('generic_mods_export.csv');
  sl.Free;
  Result := 0;
end;

end.
