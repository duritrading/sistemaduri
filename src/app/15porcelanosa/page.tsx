<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório - 15° PORCELANOSA SHOPPING</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1600px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 25px 50px rgba(0,0,0,0.15);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
            color: white;
            padding: 30px 40px;
            text-align: center;
            position: relative;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="waves" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M0 50 Q25 25 50 50 T100 50 V100 H0 Z" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23waves)"/></svg>');
            opacity: 0.3;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            position: relative;
            z-index: 1;
        }
        
        .header p {
            font-size: 1.1em;
            opacity: 0.9;
            position: relative;
            z-index: 1;
        }
        
        .info-sections {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 25px;
            padding: 30px 40px;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        }
        
        .section {
            background: white;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
            border-left: 5px solid #3498db;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .section:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 35px rgba(0,0,0,0.15);
        }
        
        .section h2 {
            color: #2c3e50;
            margin-bottom: 20px;
            font-size: 1.2em;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .info-grid {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .info-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 12px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 3px solid #3498db;
            transition: all 0.3s ease;
        }
        
        .info-item:hover {
            background: #e3f2fd;
            transform: translateX(3px);
        }
        
        .info-label {
            font-weight: 600;
            color: #555;
            font-size: 0.9em;
        }
        
        .info-value {
            color: #2c3e50;
            font-weight: 500;
            text-align: right;
            font-size: 0.9em;
        }
        
        .eta-highlight {
            background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
            color: white;
            text-align: center;
            padding: 12px;
            border-radius: 8px;
            font-weight: bold;
            box-shadow: 0 5px 15px rgba(255, 154, 158, 0.3);
            margin-top: 15px;
            font-size: 0.9em;
        }
        
        .map-container {
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            height: 500px;
            position: relative;
            overflow: hidden;
        }
        
        .world-map {
            width: 100%;
            height: 100%;
            position: relative;
            background: #f0f8ff;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 10px;
            overflow: hidden;
        }
        
        .map-placeholder {
            width: 100%;
            height: 100%;
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            position: relative;
            /* 
            EXEMPLO: Para adicionar sua imagem de rastreamento do navio:
            background-image: url('https://imgur.com/sua-imagem.jpg');
            
            Depois remova ou comente a div com class="map-overlay" no HTML
            */
        }
        
        .map-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(52, 152, 219, 0.9);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 16px;
            font-weight: bold;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
            text-align: center;
            padding: 20px;
            box-sizing: border-box;
        }
        
        .location {
            /* Removido - não mais necessário */
        }
        
        .location::after {
            /* Removido - não mais necessário */
        }
        
        @keyframes locationPulse {
            /* Removido - não mais necessário */
        }
        
        @keyframes ripple {
            /* Removido - não mais necessário */
        }
        
        .valencia {
            /* Removido - não mais necessário */
        }
        
        .suape {
            /* Removido - não mais necessário */
        }
        
        .location-label {
            /* Removido - não mais necessário */
        }
        
        .valencia-label {
            /* Removido - não mais necessário */
        }
        
        .suape-label {
            /* Removido - não mais necessário */
        }
        
        .route-arrow {
            /* Removido - não mais necessário */
        }
        
        .route-arrow::before {
            /* Removido - não mais necessário */
        }
        
        .route-arrow::after {
            /* Removido - não mais necessário */
        }
        
        @keyframes arrowFlow {
            /* Removido - não mais necessário */
        }
        
        .ship {
            /* Removido - não mais necessário */
        }
        
        @keyframes shipFloat {
            /* Removido - não mais necessário */
        }
        
        .route-info {
            position: absolute;
            bottom: 20px;
            right: 20px;
            background: rgba(0,0,0,0.85);
            color: white;
            padding: 20px 25px;
            border-radius: 12px;
            backdrop-filter: blur(15px);
            border: 1px solid rgba(255,255,255,0.2);
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            z-index: 20;
        }
        
        .route-info h3 {
            margin-bottom: 8px;
            color: #74b9ff;
            font-size: 1.1em;
        }
        
        .route-info p {
            margin: 4px 0;
            font-size: 0.9em;
        }
        
        .ocean-waves {
            /* Removido - não mais necessário */
        }
        
        @keyframes waveMove {
            /* Removido - não mais necessário */
        }
        
        .distance-info {
            position: absolute;
            top: 20px;
            left: 20px;
            background: rgba(255,255,255,0.15);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
            z-index: 20;
        }
        
        .distance-info h4 {
            margin-bottom: 8px;
            color: #74b9ff;
        }
        
        @media (max-width: 1200px) {
            .info-sections {
                grid-template-columns: 1fr;
                gap: 20px;
            }
        }
        
        @media (max-width: 768px) {
            .header h1 {
                font-size: 2em;
            }
            
            .info-sections {
                padding: 20px;
            }
            
            .map-overlay {
                font-size: 14px;
                padding: 20px;
                text-align: center;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>15° PORCELANOSA - SHOPPING</h1>
            <p>🚢 Processo de Importação Marítima Internacional</p>
        </div>
        
        <!-- Informações em Layout Horizontal -->
        <div class="info-sections">
            <!-- Transporte Marítimo -->
            <div class="section">
                <h2>🚢 Transporte Marítimo</h2>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label">Exportador:</span>
                        <span class="info-value">PORCELANOSA E BUTECH</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Companhia:</span>
                        <span class="info-value">MSC</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Navio:</span>
                        <span class="info-value">MSC AMALFI MM527A</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">BL/AWB:</span>
                        <span class="info-value">21.405</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Containers:</span>
                        <span class="info-value">MSNU7959635, MSBU8732130</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Terminal:</span>
                        <span class="info-value">ELO</span>
                    </div>
                </div>
            </div>
            
            <!-- Cronograma -->
            <div class="section">
                <h2>📅 Cronograma</h2>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label">ETA (Chegada):</span>
                        <span class="info-value">24/07/2025</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Fim do Freetime:</span>
                        <span class="info-value">14/08/2025</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Última Atualização:</span>
                        <span class="info-value">15/07/2025</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Responsável:</span>
                        <span class="info-value">Neyvson Luis G. Santos</span>
                    </div>
                </div>
                
                <div class="eta-highlight">
                    🗓️ Chegada: 24 de Julho de 2025
                </div>
            </div>
            
            <!-- Parceiros -->
            <div class="section">
                <h2>🤝 Parceiros & Documentos</h2>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label">Despachante:</span>
                        <span class="info-value">ALCANCE</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Transportadora:</span>
                        <span class="info-value">ELO</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Invoice 1:</span>
                        <span class="info-value">0725203518</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Invoice 2:</span>
                        <span class="info-value">0225219308</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Invoice 3:</span>
                        <span class="info-value">0225219298</span>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Mapa de Rastreamento Real -->
        <div class="map-container">
            <div class="world-map">
                <div class="map-placeholder">
                    <div class="map-overlay">
                        🗺️ Espaço Reservado para Imagem de Rastreamento
                        <br><br>
                        <small>Para adicionar sua imagem do rastreamento do navio:</small>
                        <br>
                        <small>1. Publique a imagem online (imgur, etc.)</small>
                        <br>
                        <small>2. Adicione: background-image: url('sua-url-aqui');</small>
                        <br>
                        <small>3. Remova esta div de sobreposição</small>
                    </div>
                </div>
                
                <!-- Informações da Rota -->
                <div class="route-info">
                    <h3>MSC AMALFI MM527A</h3>
                    <p><strong>Origem:</strong> Valencia, Espanha</p>
                    <p><strong>Destino:</strong> Porto de Suape, Brasil</p>
                    <p><strong>ETA:</strong> 24/07/2025</p>
                    <p><strong>Carga:</strong> 2 Containers PORCELANOSA</p>
                </div>
                
                <!-- Informações de Distância -->
                <div class="distance-info">
                    <h4>📏 Rota Marítima</h4>
                    <p><strong>Distância:</strong> ~5.800 km</p>
                    <p><strong>Tempo:</strong> ~12-15 dias</p>
                </div>
            </div>
        </div>
    </div>
</body>
</html>