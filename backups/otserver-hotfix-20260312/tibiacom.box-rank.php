<style>
.discord {
    width: 180px;
    height: 110px;
}

.discord_header {
    height: 31px;
    width: 180px;
    backdrop-filter: blur(2px);
    background-image: url('templates/tibiacom/images/themeboxes/header-bg.png');
    font-family: Verdana, sans-serif;
    font-weight: bold;
    color: #fff;
    text-shadow: 1px 2px 3px rgba(0, 0, 0, 0.5);
    line-height: 31px;
    text-align: center;
}

.discord_bottom {
    height: 18px;
    width: 180px;
    margin-top: -2px;
    background-image: url('templates/tibiacom/images/themeboxes/header-bg-down.png');
}

.discord_content {
    width: 181px;
    height: 58px;
    background-image: url('templates/tibiacom/images/themeboxes/bgbox.png');
    backdrop-filter: blur(4px);
    background-position: center;
    background-size: cover;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0;
}

.discord_button {
    height: 35px;
    width: 150px;
    border: none;
    background: url('templates/tibiacom/images/themeboxes/discord_button_hover.png') no-repeat center center;
    background-size: contain;
    font-family: Verdana, sans-serif;
    font-weight: normal;
    color: #fff;
    font-size: 12px;
    cursor: pointer;
    text-align: center;
    padding-left: 20px; /* se tiver ícone à esquerda */
}

.discord_button:hover {
    background: url('templates/tibiacom/images/themeboxes/discord_button.png') no-repeat center center;
    background-size: contain;
    color: #fff;
}

</style>
<div class="discord">
    <div class="discord_header">Grupo Whatsapp</div>
    <div class="discord_content">
        <a href="<?php echo $config['whatsapp_link']; ?>" target="new">
            <button type="button" class="discord_button">Entrar no Grupo</button>
        </a>
    </div>
    <div class="discord_bottom"></div>
</div>