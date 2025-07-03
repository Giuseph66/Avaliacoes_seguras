import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type Props = {
  value?: Date | null;
  onChange: (date: Date | null) => void;
  disabled?: boolean;
};

export default function DataHoraPicker({ value, onChange, disabled }: Props) {
  // Calcula data/hora padrão: agora + 45 minutos
  function getDefaultDate() {
    const now = new Date();
    const plus45 = new Date(now.getTime() + 45 * 60000);
    return plus45;
  }
  
  // Só usa data padrão se value for null E não estiver desabilitado
  const initial = value || (disabled ? null : getDefaultDate());
  const [modalVisible, setModalVisible] = useState(false);
  const [dia, setDia] = useState(initial ? initial.getDate() : 1);
  const [mes, setMes] = useState(initial ? initial.getMonth() + 1 : 1);
  const [ano, setAno] = useState(initial ? initial.getFullYear() : new Date().getFullYear());
  const [hora, setHora] = useState(initial ? initial.getHours() : 0);
  const [minuto, setMinuto] = useState(initial ? initial.getMinutes() : 0);
  const [erro, setErro] = useState('');

  function pad(n: number) { return n < 10 ? `0${n}` : n; }
  function formatDateTime() {
    if (!value) return 'Selecionar data e hora';
    return `${pad(value.getDate())}/${pad(value.getMonth() + 1)}/${value.getFullYear()} às ${pad(value.getHours())}:${pad(value.getMinutes())}`;
  }

  function abrirModal() {
    if (value) {
      setDia(value.getDate());
      setMes(value.getMonth() + 1);
      setAno(value.getFullYear());
      setHora(value.getHours());
      setMinuto(value.getMinutes());
    } else {
      const def = getDefaultDate();
      setDia(def.getDate());
      setMes(def.getMonth() + 1);
      setAno(def.getFullYear());
      setHora(def.getHours());
      setMinuto(def.getMinutes());
    }
    setErro('');
    setModalVisible(true);
  }

  function confirmar() {
    setErro('');
    const novaData = new Date(ano, mes - 1, dia, hora, minuto);
    if (
      !isNaN(novaData.getTime()) &&
      ano > 1900 &&
      mes >= 1 && mes <= 12 &&
      dia >= 1 && dia <= 31 &&
      hora >= 0 && hora <= 23 &&
      minuto >= 0 && minuto <= 59
    ) {
      onChange(novaData);
      setModalVisible(false);
    } else {
      setErro('Data ou hora inválida');
    }
  }

  // Gera arrays para pickers
  const dias = Array.from({ length: 31 }, (_, i) => i + 1);
  const meses = Array.from({ length: 12 }, (_, i) => i + 1);
  const anos = Array.from({ length: 11 }, (_, i) => new Date().getFullYear() + i);
  const horas = Array.from({ length: 24 }, (_, i) => i);
  const minutos = Array.from({ length: 60 }, (_, i) => i);

  return (
    <View style={styles.row}>
      <Pressable style={[styles.inputBtn, disabled && { opacity: 0.5 }]} onPress={abrirModal} disabled={disabled}>
        <Text style={{ color: value ? '#222' : '#888', fontSize: 16 }}>
          {formatDateTime()}
        </Text>
      </Pressable>
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Selecione data e hora</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'center', justifyContent: 'center' }}>
              {/* Dia */}
              <PickerList value={dia} setValue={setDia} options={dias} label="Dia" />
              <PickerList value={mes} setValue={setMes} options={meses} label="Mês" />
              <PickerList value={ano} setValue={setAno} options={anos} label="Ano" />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'center', justifyContent: 'center' }}>
              <PickerList value={hora} setValue={setHora} options={horas} label="Hora" />
              <Text style={{ fontSize: 18, color: '#888' }}>:</Text>
              <PickerList value={minuto} setValue={setMinuto} options={minutos} label="Minuto" />
            </View>
            {erro ? <Text style={{ color: '#e53935', marginBottom: 8 }}>{erro}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 16, justifyContent: 'center' }}>
              <Pressable style={[styles.modalBtn, { backgroundColor: '#0a7ea4' }]} onPress={confirmar}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Confirmar</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, { backgroundColor: '#aaa' }]} onPress={() => setModalVisible(false)}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cancelar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// PickerList: picker customizado para React Native
function PickerList({ value, setValue, options, label }: { value: number, setValue: (v: number) => void, options: number[], label: string }) {
  const [show, setShow] = useState(false);
  return (
    <View style={{ alignItems: 'center', minWidth: 60 }}>
      <Text style={{ fontSize: 12, color: '#888' }}>{label}</Text>
      <Pressable
        style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, backgroundColor: '#fff', marginTop: 2, paddingVertical: 6, paddingHorizontal: 10, minWidth: 48, alignItems: 'center' }}
        onPress={() => setShow(true)}
      >
        <Text style={{ fontSize: 16 }}>{value < 10 ? `0${value}` : value}</Text>
      </Pressable>
      <Modal visible={show} transparent animationType="fade" onRequestClose={() => setShow(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' }} onPress={() => setShow(false)}>
          <View style={{ position: 'absolute', top: '40%', left: '25%', right: '25%', backgroundColor: '#fff', borderRadius: 12, padding: 12, maxHeight: 220 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 15, marginBottom: 8, textAlign: 'center' }}>Selecione {label.toLowerCase()}</Text>
            <ScrollView style={{ maxHeight: 160 }}>
              {options.map(opt => (
                <Pressable key={opt} onPress={() => { setValue(opt); setShow(false); }} style={{ paddingVertical: 8, alignItems: 'center', backgroundColor: value === opt ? '#e3eaf2' : 'transparent', borderRadius: 6 }}>
                  <Text style={{ fontSize: 16 }}>{opt < 10 ? `0${opt}` : opt}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 8 },
  inputBtn: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    minWidth: 180,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    minWidth: 300,
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
});
