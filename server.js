import express from 'express';
import cors from 'cors';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const app = express();

const PORT = 5454;
const DATA_FILE = path.resolve('data', 'agendamentos.json');

app.use(cors());
app.use(express.json());

async function readAgendamentos() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf-8');

        return JSON.parse(data || '[]');
    } catch (error) {
        await fs.mkdir(path.dirname(DATA_FILE), {
            recursive: true
        });

        await fs.writeFile(
            DATA_FILE,
            JSON.stringify([], null, 2)
        );

        return [];
    }
}

async function writeAgendamentos(agendamentos) {
    await fs.mkdir(path.dirname(DATA_FILE), {
        recursive: true
    });

    await fs.writeFile(
        DATA_FILE,
        JSON.stringify(agendamentos, null, 2)
    );
}

app.get('/agendamentos', async (req, res) => {
    try {
        const agendamentos = await readAgendamentos();

        res.json(agendamentos);
    } catch (err) {
        console.error(err);

        res.status(500).json({
            error: 'Erro ao carregar agendamentos'
        });
    }
});

app.get('/agendamentos/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const agendamentos = await readAgendamentos();

        const agendamento = agendamentos.find(
            (item) => item.id === id
        );

        if (!agendamento) {
            return res.status(404).json({
                error: 'Agendamento não encontrado'
            });
        }

        res.json(agendamento);

    } catch (err) {
        console.error(err);

        res.status(500).json({
            error: 'Erro ao carregar agendamento'
        });
    }
});

app.post('/agendamentos', async (req, res) => {
    try {
        const {
            nome,
            telefone,
            servico,
            data,
            horario,
            observacao
        } = req.body;

        // Campos obrigatórios
        if (!nome || !telefone || !servico || !data || !horario) {
            return res.status(400).json({
                error: 'Nome, telefone, serviço, data e horário são obrigatórios'
            });
        }

        // Serviços permitidos
        const servicosPermitidos = [
            'Corte Sparta — R$ 60,00',
            'Combo Sparta — R$ 100,00',
            'Barba Express & Toalha — R$ 50,00'
        ];

        if (!servicosPermitidos.includes(servico)) {
            return res.status(400).json({
                error: 'Serviço inválido'
            });
        }

        // Horários permitidos
        const horariosPermitidos = [
            '09:00',
            '10:00',
            '11:00',
            '12:00',
            '13:00',
            '14:00',
            '15:00',
            '16:00',
            '17:00',
            '18:00',
            '19:00'
        ];

        if (!horariosPermitidos.includes(horario)) {
            return res.status(400).json({
                error: 'Horário inválido'
            });
        }

        const agendamentos = await readAgendamentos();

        // Verifica se o horário já está ocupado
        const horarioOcupado = agendamentos.some(
            (item) =>
                item.data === data &&
                item.horario === horario
        );

        if (horarioOcupado) {
            return res.status(409).json({
                error: 'Este horário já está agendado'
            });
        }

        const novoAgendamento = {
            id: crypto.randomUUID(),
            nome,
            telefone,
            servico,
            data,
            horario,
            observacao: observacao || '',
            criadoEm: new Date().toISOString()
        };

        agendamentos.push(novoAgendamento);

        await writeAgendamentos(agendamentos);

        res.status(201).json(novoAgendamento);

    } catch (err) {
        console.error(err);

        res.status(500).json({
            error: 'Erro ao salvar agendamento'
        });
    }
});

app.put('/agendamentos/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const {
            nome,
            telefone,
            servico,
            data,
            horario,
            observacao
        } = req.body;

        const agendamentos = await readAgendamentos();

        const index = agendamentos.findIndex(
            (item) => item.id === id
        );

        if (index === -1) {
            return res.status(404).json({
                error: 'Agendamento não encontrado'
            });
        }

        if (data || horario) {
            const novaData = data ?? agendamentos[index].data;
            const novoHorario =
                horario ?? agendamentos[index].horario;

            const horarioOcupado = agendamentos.some(
                (item, i) =>
                    i !== index &&
                    item.data === novaData &&
                    item.horario === novoHorario
            );

            if (horarioOcupado) {
                return res.status(409).json({
                    error: 'Este horário já está agendado'
                });
            }
        }

        agendamentos[index] = {
            ...agendamentos[index],

            nome: nome ?? agendamentos[index].nome,
            telefone: telefone ?? agendamentos[index].telefone,
            servico: servico ?? agendamentos[index].servico,
            data: data ?? agendamentos[index].data,
            horario: horario ?? agendamentos[index].horario,
            observacao:
                observacao ?? agendamentos[index].observacao
        };

        await writeAgendamentos(agendamentos);

        res.json(agendamentos[index]);

    } catch (err) {
        console.error(err);

        res.status(500).json({
            error: 'Erro ao atualizar agendamento'
        });
    }
});

app.delete('/agendamentos/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const agendamentos = await readAgendamentos();

        const index = agendamentos.findIndex(
            (item) => item.id === id
        );

        if (index === -1) {
            return res.status(404).json({
                error: 'Agendamento não encontrado'
            });
        }

        agendamentos.splice(index, 1);

        await writeAgendamentos(agendamentos);

        res.status(200).json({
            message: 'Agendamento deletado com sucesso'
        });

    } catch (err) {
        console.error(err);

        res.status(500).json({
            error: 'Erro ao deletar agendamento'
        });
    }
});

app.listen(PORT, () => {
    console.log(
        `Servidor rodando em http://localhost:${PORT}`
    );
});