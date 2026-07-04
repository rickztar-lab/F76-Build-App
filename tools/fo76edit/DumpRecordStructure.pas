unit DumpRecordStructure;

var
  sl: TStringList;

function SafeGetValue(e: IInterface; path: string): string;
begin
  try
    Result := GetElementEditValues(e, path);
  except
    Result := '';
  end;
end;

// Para un elemento hoja (sin hijos), el valor se lee con GetEditValue(e)
// directamente sobre el elemento, no con un path vacío sobre un contenedor.
function SafeLeafValue(e: IInterface): string;
begin
  try
    Result := GetEditValue(e);
  except
    Result := '';
  end;
end;

function SafeName(e: IInterface): string;
begin
  try
    Result := Name(e);
  except
    Result := '';
  end;
end;

procedure DumpElement(e: IInterface; prefix: string; depth: integer);
var
  i, count: integer;
  child: IInterface;
  childName: string;
begin
  if depth > 4 then begin
    sl.Add(prefix + ' (profundidad máxima alcanzada, corte de seguridad)');
    Exit;
  end;

  count := 0;
  try
    count := ElementCount(e);
  except
  end;

  if count = 0 then begin
    sl.Add(prefix + ' = ' + SafeLeafValue(e));
    Exit;
  end;

  for i := 0 to count - 1 do begin
    child := nil;
    try
      child := ElementByIndex(e, i);
    except
    end;
    if not Assigned(child) then Continue;

    childName := SafeName(child);
    sl.Add(prefix + '\' + childName + ' = ' + SafeLeafValue(child));
    DumpElement(child, prefix + '\' + childName, depth + 1);
  end;
end;

function Initialize: integer;
begin
  sl := TStringList.Create;
  Result := 0;
end;

function Process(e: IInterface): integer;
var
  editorID, fullName, sig: string;
begin
  sig := '';
  try
    sig := Signature(e);
  except
  end;

  editorID := SafeGetValue(e, 'EDID');
  fullName := SafeGetValue(e, 'FULL');

  sl.Add('=== [' + sig + '] ' + editorID + ' "' + fullName + '" ===');
  DumpElement(e, '', 0);
  sl.Add('');

  Result := 0;
end;

function Finalize: integer;
begin
  sl.SaveToFile('record_structure_dump.txt');
  sl.Free;
  Result := 0;
end;

end.
