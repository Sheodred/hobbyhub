-- One-time production migration for machine-translated German descriptions
-- (#129), first batch: the top 100 games by BGG's overall rank, plus all 22
-- games in this year's Spiel/Kennerspiel/Kinderspiel des Jahres pots.
--
-- The local docker-compose MariaDB applies schema.sql automatically, but
-- production (IONOS) does not - schema.sql is applied by hand once, and this
-- table was added after that. Run this file against the production
-- `hobbyhub` database via phpMyAdmin (SQL tab) or the CLI:
--
--   mysql -u<user> -p <database> < api/sql/2026_game_descriptions.sql
--
-- Safe to re-run: the table is created only if missing, and INSERT IGNORE
-- skips a (bgg_id, lang) pair that already has a row rather than erroring or
-- duplicating.
-- Verify afterwards with:  SELECT COUNT(*) FROM game_descriptions;  -- expect >= 122.
--
-- Translated by Claude (Anthropic), from BGG's own English `description`
-- field fetched live on 2026-08-19 - not from memory, and not through any
-- live translation API (see schema.sql's comment on game_descriptions for
-- why: production cannot reach one at request time). Reviewed for meaning,
-- not word-for-word - board game rules prose translates better idiomatically
-- than literally. `source` stays 'machine-translated' (the column default)
-- so the frontend's honesty label always applies to this data, per #129.

CREATE TABLE IF NOT EXISTS game_descriptions (
    bgg_id INT NOT NULL,
    lang VARCHAR(8) NOT NULL,
    description TEXT NOT NULL,
    source VARCHAR(32) NOT NULL DEFAULT 'machine-translated',
    PRIMARY KEY (bgg_id, lang)
);

INSERT IGNORE INTO game_descriptions (bgg_id, lang, description) VALUES
(224517, 'de', 'Brass: Birmingham ist eine Fortsetzung von Martin Wallaces Meisterwerk Brass aus dem Jahr 2007 und ein Wirtschaftsstrategiespiel. Brass: Birmingham erzählt die Geschichte konkurrierender Unternehmer im Birmingham der industriellen Revolution zwischen 1770 und 1870.

Das Spiel bietet einen ganz anderen Handlungsbogen und eine andere Erfahrung als sein Vorgänger. Wie im Vorgänger müsst ihr eure Industrien und euer Netzwerk entwickeln, ausbauen und etablieren, um niedrige oder hohe Marktnachfragen auszunutzen. Das Spiel wird in zwei Hälften gespielt: die Kanal-Ära (1770-1830) und die Eisenbahn-Ära (1830-1870). Um zu gewinnen, erzielt die meisten Siegpunkte. Diese werden am Ende jeder Hälfte für Kanäle, Eisenbahnen und etablierte (umgedrehte) Industrieplättchen gezählt.

In jeder Runde sind die Spieler gemäß der Zugreihenfolge abwechselnd an der Reihe und erhalten zwei Aktionen für Folgendes (aus dem Originalspiel):

1) Bauen - Bezahlt die benötigten Ressourcen und platziert ein Industrieplättchen.
2) Vernetzen - Fügt eine Eisenbahn-/Kanalverbindung hinzu und erweitert euer Netzwerk.
3) Entwickeln - Erhöht den Siegpunktwert einer Industrie.
4) Verkaufen - Verkauft eure Baumwolle, Fertigwaren und Keramik.
5) Kredit - Nehmt einen Kredit über £30 auf und verringert euer Einkommen.

Brass: Birmingham bietet außerdem eine neue, sechste Aktion:

6) Kundschaften - Legt drei Karten ab und nehmt eine beliebige Orts- und eine beliebige Industriekarte. (Diese Aktion ersetzt die doppelte Bauaktion aus dem ursprünglichen Brass.)'),
(342942, 'de', 'In Ark Nova plant und gestaltet ihr einen modernen, wissenschaftlich geführten Zoo. Mit dem Ziel, die erfolgreichste zoologische Einrichtung zu besitzen, baut ihr Gehege, nehmt Tiere auf und unterstützt Artenschutzprojekte in aller Welt. Spezialisten und einzigartige Gebäude helfen euch dabei, dieses Ziel zu erreichen.

Jeder Spieler verfügt über fünf Aktionskarten zur Steuerung seines Spielzugs, wobei die Stärke einer Aktion durch den Platz bestimmt wird, den die Karte gerade einnimmt. Die Karten im Einzelnen:

KARTEN: Ermöglicht euch, neue Zookarten zu erhalten (Tiere, Sponsoren und Artenschutzprojekt-Karten).
BAUEN: Ermöglicht euch, Standard- oder Sondergehege, Kioske und Pavillons zu bauen.
TIERE: Ermöglicht euch, Tiere in eurem Zoo unterzubringen.
VERBAND: Ermöglicht euren Verbandsmitarbeitern, verschiedene Aufgaben auszuführen.
SPONSOREN: Ermöglicht euch, eine Sponsorenkarte in eurem Zoo einzusetzen oder Geld zu beschaffen.

255 Karten mit Tieren, Spezialisten, Sondergehegen und Artenschutzprojekten, jede mit einer besonderen Fähigkeit, bilden das Herzstück von Ark Nova. Nutzt sie, um die Attraktivität und den wissenschaftlichen Ruf eures Zoos zu steigern und Artenschutzpunkte zu sammeln.

- Beschreibung des Verlags'),
(161936, 'de', 'Pandemic Legacy ist ein kooperatives Kampagnenspiel mit einem übergreifenden Handlungsbogen über 12 bis 24 Sitzungen, abhängig davon, wie gut eure Gruppe im Spiel abschneidet. Zu Beginn startet das Spiel sehr ähnlich wie das Grundspiel Pandemic: Euer Team von Seuchenbekämpfern reist gegen die Zeit um die Welt, behandelt Krankheitsherde und erforscht Heilmittel für vier Seuchen, bevor diese außer Kontrolle geraten.

Während des Zuges eines Spielers stehen ihm vier Aktionen zur Verfügung, mit denen er auf verschiedene Weise um die Welt reisen kann (manchmal muss dafür eine Karte abgeworfen werden), Forschungsstationen bauen, Krankheiten behandeln (ein Würfel vom Spielplan entfernen; sind alle Würfel einer Farbe entfernt, ist die Krankheit ausgerottet), Karten mit anderen Spielern tauschen oder ein Heilmittel für eine Krankheit finden (dafür müssen fünf Karten derselben Farbe an einer Forschungsstation abgeworfen werden). Jeder Spieler hat eine einzigartige Rolle mit besonderen Fähigkeiten, die ihm bei diesen Aktionen helfen.

Nachdem ein Spieler seine Aktionen ausgeführt hat, zieht er zwei Karten. Diese können Epidemiekarten enthalten, die neue Krankheitswürfel auf den Plan bringen und zu einem Ausbruch führen können, der die Krankheitswürfel noch weiter verbreitet. Ausbrüche erhöhen zudem das Panikniveau einer Stadt, wodurch Reisen dorthin teurer werden.

Jeden Monat im Spiel habt ihr zwei Versuche, die Ziele dieses Monats zu erreichen. Gelingt es euch, gewinnt ihr und geht sofort zum nächsten Monat über. Scheitert ihr, habt ihr einen zweiten Versuch mit mehr Mitteln für hilfreiche Ereigniskarten.

Im Verlauf der Kampagne werden neue Regeln und Komponenten eingeführt. Diese erfordern manchmal, dass ihr die Spielkomponenten dauerhaft verändert - darunter das Beschriften von Karten, das Zerreißen von Karten und das Anbringen dauerhafter Aufkleber auf Komponenten. Eure Charaktere können neue Fähigkeiten oder auch nachteilige Effekte erhalten. Ein Charakter kann sogar vollständig verloren gehen und steht dann nicht mehr zur Verfügung.

Teil der Pandemic-Reihe'),
(174430, 'de', 'Gloomhaven ist ein Spiel mit euro-inspiriertem taktischem Kampf in einer beständigen Welt wechselnder Beweggründe. Die Spieler übernehmen die Rollen umherziehender Abenteurer mit eigenen besonderen Fähigkeiten und eigenen Gründen, in diesen dunklen Winkel der Welt zu reisen. Die Spieler müssen notgedrungen zusammenarbeiten, um bedrohliche Verliese und vergessene Ruinen zu räumen. Dabei verbessern sie ihre Fähigkeiten durch Erfahrung und Beute, entdecken neue Orte zum Erkunden und Plündern und erweitern eine sich stets verzweigende Geschichte, die von ihren eigenen Entscheidungen angetrieben wird.

Dies ist ein Spiel mit einer beständigen und sich verändernden Welt, das idealerweise über viele Spielsitzungen hinweg gespielt wird. Nach einem Szenario treffen die Spieler Entscheidungen darüber, was als Nächstes zu tun ist, was bestimmt, wie die Geschichte weitergeht - ähnlich einem "Wähle dein eigenes Abenteuer"-Buch. Das Durchspielen eines Szenarios ist eine kooperative Angelegenheit, bei der die Spieler gegen automatisierte Monster kämpfen und dabei ein innovatives Kartensystem nutzen, um die Zugreihenfolge und die Handlungen der Spieler zu bestimmen.

In jedem Zug wählt ein Spieler zwei Karten aus seiner Hand aus. Die Zahl auf der obersten Karte bestimmt seine Initiative für die Runde. Jede Karte hat außerdem eine obere und eine untere Aktion, und wenn ein Spieler gemäß der Initiativreihenfolge an der Reihe ist, entscheidet er, ob er die obere Aktion der einen Karte und die untere der anderen nutzt oder umgekehrt. Die Spieler müssen dabei vorsichtig sein, denn mit der Zeit verlieren sie dauerhaft Karten aus der Hand. Brauchen sie zu lange, um ein Verlies zu räumen, kann es sein, dass sie erschöpft sind und sich zurückziehen müssen.'),
(397598, 'de', 'In Dune: Imperium Uprising wollt ihr weiterhin militärische Macht mit politischen Intrigen ausbalancieren und dabei neue Werkzeuge auf dem Weg zum Sieg einsetzen. Spione festigen eure Pläne, wichtige Verträge erweitern eure Ressourcen, oder ihr lernt die Wege der Fremen kennen und reitet auf mächtigen Sandwürmern in die Schlacht!

Dune: Imperium Uprising ist ein eigenständiger Ableger von Dune: Imperium, der die Mischung aus Deckbau und Arbeitereinsatz des Originals erweitert und einen neuen Sechs-Spieler-Modus einführt, in dem zwei Teams im größten Konflikt bisher gegeneinander antreten.

Die Dune: Imperium-Erweiterungen Rise of Ix und Immortality funktionieren mit Uprising, ebenso fast alle Karten aus dem Grundspiel, und Elemente aus Uprising können mit Dune: Imperium verwendet werden.

Die Entscheidung liegt bei euch. Das Imperium wartet!'),
(316554, 'de', 'Dune: Imperium ist ein Spiel, das Deckbau nutzt, um dem traditionellen Arbeitereinsatz eine Ebene verborgener Information hinzuzufügen. Es lässt sich von Elementen und Figuren aus dem Dune-Vermächtnis inspirieren, sowohl vom neuen Film von Legendary Pictures als auch von der bahnbrechenden literarischen Reihe von Frank Herbert, Brian Herbert und Kevin J. Anderson.

Als Anführer eines der Großen Häuser des Landsraad erhebt eure Fahne und mobilisiert eure Streitkräfte und Spione. Der Krieg naht, und im Zentrum des Konflikts steht Arrakis - Dune, der Wüstenplanet.

Ihr beginnt mit einer einzigartigen Anführerkarte sowie einem Deck, das mit denen eurer Gegner identisch ist. Während ihr Karten erwerbt und euer Deck aufbaut, bestimmen eure Entscheidungen eure Stärken und Schwächen. Karten erlauben es euch, eure Agenten zu bestimmten Feldern auf dem Spielplan zu senden, sodass die Entwicklung eures Decks eure Strategie beeinflusst. Ihr könnt militärisch mächtiger werden und mehr Truppen einsetzen als eure Gegner. Oder ihr erwerbt Karten, die euch einen Vorteil bei den vier im Spiel vertretenen politischen Fraktionen verschaffen: dem Imperator, der Raumfahrer-Gilde, den Bene Gesserit und den Fremen.

Anders als bei vielen Deckbauspielen spielt ihr nicht eure gesamte Hand in einem Zug. Stattdessen zieht ihr zu Beginn jeder Runde eine Kartenhand und wechselt euch mit den anderen Spielern ab, wobei ihr jeweils einen Agentenzug macht (eine Karte spielt, um einen eurer Agenten auf den Spielplan zu senden). Wenn ihr an der Reihe seid und keine Agenten mehr einsetzen könnt, macht ihr einen Aufdeckzug, bei dem ihr den Rest eurer Karten aufdeckt, die Überzeugungskraft und Schwerter liefern. Überzeugungskraft dient dem Erwerb weiterer Karten, und Schwerter helfen euren Truppen, um die Belohnungen der aktuellen Runde zu kämpfen, wie sie auf der aufgedeckten Konfliktkarte angezeigt werden.

Besiegt eure Rivalen im Kampf, navigiert klug durch die politischen Fraktionen und erwerbt wertvolle Karten. Das Spice muss fließen, damit euer Haus zum Sieg geführt wird!

Einige wichtige Links: das offizielle FAQ, das inoffizielle FAQ und eine Übersicht zur Automa (Solo und 2 Spieler)'),
(233078, 'de', 'Twilight Imperium (Vierte Edition) ist ein Spiel galaktischer Eroberung, in dem drei bis sechs Spieler jeweils die Rolle einer von siebzehn Fraktionen übernehmen, die durch militärische Macht, politisches Manövrieren und wirtschaftliches Verhandeln um die galaktische Vorherrschaft ringen. Jede Fraktion bietet ein völlig anderes Spielerlebnis, von den wurmlochspringenden Geistern von Creuss bis zu den Emiraten von Hacan, den Meistern von Handel und Wirtschaft. Diese siebzehn Völker haben viele Wege zum Sieg, aber nur eines darf auf dem Thron von Mecatol Rex als neuer Herrscher der Galaxis sitzen.

Keine zwei Partien Twilight Imperium sind je identisch. Zu Beginn jedes galaktischen Zeitalters wird der Spielplan einzigartig und strategisch aus 51 Galaxie-Plättchen zusammengesetzt, die von üppigen neuen Planeten und Supernovae bis zu Asteroidenfeldern und Gravitationsrissen alles bieten. Die Spieler erhalten eine Hand dieser Plättchen und legen abwechselnd die Galaxie um Mecatol Rex, den im Zentrum des Plans gelegenen Hauptplaneten, an. Ein Ionensturm kann euer Volk daran hindern, durch die Galaxis vorzudringen, während ein günstig platzierter Gravitationsriss euch vor euren nächsten Feinden schützen kann. Die Galaxis liegt in euren Händen, sowohl gestaltet als auch beherrscht zu werden.

Eine Runde Twilight Imperium beginnt damit, dass die Spieler eine von acht Strategiekarten wählen, die sowohl die Spielerreihenfolge bestimmen als auch ihrem Besitzer eine einzigartige strategische Aktion für diese Runde gewähren. Diese können alles Mögliche bewirken, von zusätzlichen Befehlsmarkern bis zur Kontrolle des Handels in der gesamten Galaxis. Nach der Wahl der Strategien bewegen die Spieler abwechselnd ihre Flotten von System zu System, beanspruchen neue Planeten für ihre Imperien und führen Kriege und Handel mit anderen Fraktionen. Am Ende eines Zuges versammeln sich die Spieler in einem großen Rat, um neue Gesetze und Agenden zu verabschieden, was das Spiel auf unvorhersehbare Weise durcheinanderbringt.

Nachdem jeder Spieler seinen Zug beendet hat, rücken die Spieler auf der Siegleiste vor, indem sie prüfen, ob sie im Laufe des Zuges Ziele erfüllt haben, und diese werten. Ziele werden bestimmt, indem zu Spielbeginn zehn öffentliche Zielkarten ausgelegt und im Spielverlauf nach und nach aufgedeckt werden. Jeder Spieler wählt zudem zu Spielbeginn zwischen zwei zufälligen geheimen Zielen, deren Erfüllung Siegpunkte einbringt - nur für den Besitzer dieses Ziels. Diese Ziele reichen von der Erforschung neuer Technologien bis zur Einnahme des Heimatsystems eines Nachbarn. Am Ende jedes Zuges kann ein Spieler ein öffentliches und ein geheimes Ziel beanspruchen. Im weiteren Spielverlauf werden mehr dieser Ziele aufgedeckt und mehr geheime Ziele verteilt, was den Spielern im Laufe des Spiels dynamisch wechselnde Ziele beschert. Das Spiel geht weiter, bis ein Spieler zehn Siegpunkte erreicht.

- Beschreibung des Verlags'),
(115746, 'de', 'In War of the Ring übernimmt ein Spieler die Kontrolle über die Freien Völker (FP), während der andere die Heere des Schattens (SA) kontrolliert. Zunächst zögern die Völker der Freien, gegen Sauron zu den Waffen zu greifen; sie müssen erst von Sauron angegriffen oder von Gandalf oder anderen Gefährten überzeugt werden, bevor sie ernsthaft in den Krieg um den Ring eintreten - dies wird durch die Politische Leiste dargestellt, die anzeigt, ob ein Volk bereit ist, im Krieg um den Ring zu kämpfen, oder nicht.

Das Spiel kann durch einen militärischen Sieg gewonnen werden, wenn Sauron eine bestimmte Anzahl an Städten und Festungen der Freien Völker erobert, oder umgekehrt. Die wahre Hoffnung der Freien Völker liegt jedoch in der Aufgabe des Ringträgers: Während die Heere quer durch Mittelerde aufeinanderprallen, versucht die Gefährtenschaft des Rings, heimlich den Schicksalsberg zu erreichen, um den Einen Ring zu zerstören. Sauron kennt die wahre Absicht seiner Feinde nicht, sucht aber überall in Mittelerde nach dem kostbaren Ring, sodass die Gefährtenschaft zahlreichen Gefahren begegnet, dargestellt durch die Regeln der Jagd nach dem Ring. Doch die Gefährten können die Freien Völker zum Kampf gegen Sauron anspornen, sodass der Spieler der Freien Völker die Notwendigkeit, den Ringträger vor Schaden zu bewahren, mit dem Versuch abwägen muss, eine angemessene Verteidigung gegen die Heere des Schattens aufzubauen, damit diese Mittelerde nicht überrennen, bevor der Ringträger seine Aufgabe erfüllt hat.

Jede Spielrunde dreht sich um das Werfen der Aktionswürfel: Jeder Würfel entspricht einer Aktion, die ein Spieler während eines Zuges ausführen kann. Je nach gewürfeltem Symbol sind unterschiedliche Aktionen möglich (Heere oder Charaktere bewegen, Truppen anwerben, die Politische Leiste vorrücken).

Aktionswürfel können auch genutzt werden, um Ereigniskarten zu ziehen oder zu spielen. Ereigniskarten werden gespielt, um bestimmte Ereignisse aus der Geschichte darzustellen (oder Ereignisse, die möglicherweise stattgefunden haben könnten), die sich nicht durch den normalen Spielverlauf abbilden lassen. Jede Ereigniskarte kann zudem eine unerwartete Wendung im Spiel bewirken, indem sie besondere Aktionen ermöglicht oder den Verlauf einer Schlacht verändert.'),
(167791, 'de', 'In den 2400er-Jahren beginnt die Menschheit damit, den Planeten Mars zu terraformen. Riesige Konzerne, gesponsert von der Weltregierung auf der Erde, starten gewaltige Projekte, um die Temperatur, den Sauerstoffgehalt und die Ozeanbedeckung zu erhöhen, bis die Umwelt bewohnbar ist. In Terraforming Mars spielt ihr eine dieser Konzerne und arbeitet gemeinsam am Terraforming-Prozess, konkurriert aber um Siegpunkte, die nicht nur für euren Beitrag zum Terraforming vergeben werden, sondern auch für den Ausbau der menschlichen Infrastruktur im gesamten Sonnensystem und andere lobenswerte Taten.

Als Spieler erwerbt ihr einzigartige Projektkarten (aus über zweihundert verschiedenen), indem ihr sie auf die Hand kauft. Die Karten können euch sofortige Boni gewähren sowie eure Produktion verschiedener Ressourcen steigern. Viele Karten haben zudem Voraussetzungen und werden spielbar, sobald Temperatur, Sauerstoff oder Ozeanbedeckung ausreichend gestiegen sind. Karten zu kaufen ist teuer, daher gilt es, eine Balance zwischen dem Kauf und dem tatsächlichen Spielen von Karten zu finden. Standardprojekte stehen immer zur Verfügung, um eure Kartenhand zu ergänzen. Euer Grundeinkommen sowie eure Grundpunktzahl basieren auf eurer Terraforming-Wertung. Euer Einkommen wird jedoch durch eure Produktion gesteigert, und Siegpunkte stammen auch aus vielen anderen Quellen.

Ihr behaltet den Überblick über eure Produktion und Ressourcen auf eurem Spielertableau. Das Spiel verwendet sechs Ressourcenarten: MegaCredits, Stahl, Titan, Pflanzen, Energie und Wärme. Auf dem Spielplan konkurriert ihr um die besten Plätze für eure Stadt-, Ozean- und Grünflächen-Plättchen. Ihr konkurriert außerdem um verschiedene Meilensteine und Auszeichnungen, die viele Siegpunkte wert sind. Jede Runde wird als Generation bezeichnet und besteht aus folgenden Phasen:

1) Die Spielerreihenfolge verschiebt sich im Uhrzeigersinn.
2) Forschungsphase: Alle Spieler kaufen Karten aus vier privat gezogenen Karten.
3) Aktionsphase: Die Spieler führen abwechselnd 1-2 Aktionen aus diesen Optionen aus: eine Karte spielen, einen Meilenstein beanspruchen, eine Auszeichnung finanzieren, ein Standardprojekt nutzen, Pflanzen in Grünflächen-Plättchen umwandeln (und dabei den Sauerstoff erhöhen), Wärme in einen Temperaturanstieg umwandeln und die Aktion einer im Spiel befindlichen Karte nutzen. Der Zug geht reihum weiter (manchmal mehrere Runden), bis alle Spieler gepasst haben.
4) Produktionsphase: Die Spieler erhalten Ressourcen gemäß ihrer Terraforming-Wertung und ihrer Produktionsparameter.

Sobald die drei globalen Parameter (Temperatur, Sauerstoff, Ozean) alle ihr erforderliches Niveau erreicht haben, ist das Terraforming abgeschlossen, und das Spiel endet nach dieser Generation. Kombiniert eure Terraforming-Wertung mit weiteren Siegpunkten, um den siegreichen Konzern zu bestimmen!'),
(187645, 'de', 'Star Wars: Rebellion ist ein Brettspiel über den epischen Konflikt zwischen dem Galaktischen Imperium und der Rebellen-Allianz für zwei bis vier Spieler.

Erlebt den Galaktischen Bürgerkrieg wie nie zuvor. In Rebellion kontrolliert ihr entweder das gesamte Galaktische Imperium oder die aufkeimende Rebellen-Allianz. Ihr müsst Raumschiffe befehligen, Truppenbewegungen berücksichtigen und Systeme für eure Sache gewinnen. Aufgrund der Unterschiede zwischen Imperium und Rebellen-Allianz hat jede Seite unterschiedliche Siegbedingungen, und ihr müsst euren Spielstil je nach vertretener Seite anpassen:

Als imperialer Spieler befehligt ihr Legionen von Sturmtruppen, Schwärme von TIE-Jägern, Sternzerstörer und sogar den Todesstern. Ihr herrscht mit Furcht über die Galaxis und verlasst euch auf die Macht eures gewaltigen Militärs, um euren Willen durchzusetzen. Um zu gewinnen, müsst ihr die aufkeimende Rebellen-Allianz ausschalten, indem ihr ihre Basis findet und vernichtet. Auf dem Weg dorthin könnt ihr Welten unterwerfen oder sogar zerstören.

Als Rebellen-Spieler befehligt ihr Dutzende Trooper, T-47-Luftgleiter, corellianische Corvetten und Jägerstaffeln. Diese Streitkräfte sind dem imperialen Militär jedoch nicht gewachsen. In Bezug auf die reine Stärke seid ihr von Anfang an klar unterlegen, daher müsst ihr die Planeten für eure Sache gewinnen und gezielte militärische Schläge ausführen, um imperiale Werften zu sabotieren und wertvolle Informationen zu stehlen. Um den Galaktischen Bürgerkrieg zu gewinnen, müsst ihr die Bürger der Galaxis für eure Sache gewinnen. Überlebt ihr lange genug und stärkt euren Ruf, inspiriert ihr die Galaxis zu einer umfassenden Revolte, und ihr gewinnt.

Mit mehr als 150 Plastikminiaturen und zwei Spielplänen, die zweiunddreißig der bemerkenswertesten Systeme der Star-Wars-Galaxis abbilden, bietet Rebellion einen Umfang, der so groß und mitreißend ist wie kein Star-Wars-Spiel zuvor.

Doch bei aller Größe bleibt Rebellion zutiefst persönlich, filmisch und heldenhaft. So sehr euer Erfolg von der Stärke eurer Raumschiffe, Fahrzeuge und Truppen abhängt, so sehr hängt er auch von den individuellen Bemühungen so bemerkenswerter Charaktere wie Leia Organa, Mon Mothma, Großmoff Tarkin und Imperator Palpatine ab. Während sich der Bürgerkrieg über die Galaxis ausbreitet, sind diese Anführer für eure Bemühungen unverzichtbar, und die geheimen Missionen, die sie versuchen, wecken viele der eindrucksvollsten Momente aus der klassischen Trilogie. Vielleicht schickt ihr Luke Skywalker zur Jedi-Ausbildung nach Dagobah oder lasst Darth Vader eine Falle stellen, die Han Solo in Carbonit einfriert!'),
(162886, 'de', 'In den entlegensten Winkeln der Welt existiert noch Magie, verkörpert durch Geister des Landes, des Himmels und aller natürlichen Dinge. Während die großen Mächte Europas ihre Kolonialreiche immer weiter ausdehnen, werden sie unweigerlich Anspruch auf einen Ort erheben, an dem Geister noch Macht besitzen - und wenn sie das tun, wird das Land selbst gemeinsam mit den dort lebenden Insulanern zurückschlagen.

Spirit Island ist ein komplexes und thematisches kooperatives Spiel über die Verteidigung eurer Inselheimat gegen kolonisierende Invasoren. Die Spieler sind verschiedene Geister des Landes, jeder mit eigenen einzigartigen elementaren Kräften. In jedem Zug wählen die Spieler gleichzeitig, welche ihrer Machtkarten sie spielen, und bezahlen dafür Energie. Kombinationen von Machtkarten, die zu den elementaren Affinitäten eines Geistes passen, können kostenlose Bonuseffekte gewähren. Schnellere Kräfte wirken sofort, bevor sich die Invasoren ausbreiten und verwüsten, andere Magien sind langsamer und erfordern Weitsicht und Planung, um wirksam eingesetzt zu werden. In der Geisterphase gewinnen die Geister Energie und entscheiden, ob und wie sie wachsen: gebrauchte Machtkarten zurückholen, nach neuer Macht suchen oder ihre Präsenz in neue Gebiete der Insel ausbreiten.

Die Invasoren breiten sich auf semi-vorhersehbare Weise über die Inselkarte aus. In jedem Zug erkunden sie einige Länder (Teile der Insel); im nächsten Zug bauen sie dort und errichten Städte und Ortschaften. Im darauffolgenden Zug verwüsten sie dort, bringen Verderbnis über das Land und greifen anwesende einheimische Insulaner an. Die Insulaner wehren sich gegen die Invasoren, wenn sie angegriffen werden, und leisten den Geistern auch andere Hilfe, tun dies jedoch nicht immer genau so, wie ihr es euch erhofft hättet. Manche Kräfte wirken durch die Insulaner und helfen ihnen beispielsweise, die Invasoren zu vertreiben oder das Land von Verderbnis zu reinigen.

Das Spiel eskaliert im Spielverlauf: Die Geister breiten ihre Präsenz auf neue Teile der Insel aus und suchen neue und mächtigere Kräfte, während die Invasoren ihre Kolonisierungsbemühungen verstärken. Jeder Zug stellt 1-3 Jahre einer alternativen Geschichte dar. Zu Spielbeginn erfordert der Sieg die Vernichtung jedes einzelnen Entdeckers, jeder Ortschaft und jeder Stadt auf dem Spielplan - doch je mehr ihr die Invasoren erschreckt, desto leichter wird der Sieg: Sie fliehen sogar dann, wenn noch Entdecker oder sogar Ortschaften und Städte übrig sind. Eine Niederlage tritt ein, wenn ein Geist zerstört wird, die Insel von Verderbnis überrannt wird oder das Invasoren-Deck vor dem Sieg aufgebraucht ist.

Das Spiel enthält verschiedene Widersacher, gegen die ihr antreten könnt (z. B. eine schwedische Bergbaukolonie oder eine abgelegene britische Kolonie). Jeder verändert das Spiel auf andere Weise und bietet einen eigenen Weg steigender Schwierigkeit, um das Spiel herausfordernd zu halten, während ihr an Können gewinnt.'),
(291457, 'de', 'Gloomhaven: Jaws of the Lion ist ein eigenständiges Spiel, das vor den Ereignissen von Gloomhaven spielt. Das Spiel enthält vier neue Charaktere - Valrath-Rotgardist (Tank, Crowd-Control), Inox-Beilschwinger (Fernkampfschaden), Menschliche Leerenwärterin (Unterstützung, Gedankenkontrolle) und Quatryl-Sprengmeister (Nahkampfschaden, Hindernismanipulation) -, die auch im ursprünglichen Gloomhaven verwendet werden können.

Das Spiel enthält außerdem 16 Monstertypen (darunter sieben neue Standardmonster und drei neue Bosse) sowie eine neue Kampagne mit 25 Szenarien, in denen die Helden eingeladen werden, einen Fall mysteriöser Verschwindenfälle in der Stadt zu untersuchen. Ist es das Werk von Vermlingen, oder steckt etwas weit Finstereres dahinter?

Gloomhaven: Jaws of the Lion richtet sich an ein eher gelegentliches Publikum, um Menschen schneller ins Spielgeschehen zu bringen. Alle schwer zu organisierenden Karton-Kartenplättchen wurden entfernt, stattdessen spielen die Spieler direkt im Szenarienbuch selbst, das für jedes Szenario neue, einzigartige Illustrationen bietet. Auch die letzte Einstiegshürde - das Erlernen des Spiels - wurde durch ein vereinfachtes Regelwerk und ein Fünf-Szenarien-Tutorial gesenkt, das neue Spieler behutsam an das Erlebnis heranführt.'),
(220308, 'de', 'Gaia Project ist ein neues Spiel in der Reihe von Terra Mystica. Wie im Original Terra Mystica leben vierzehn verschiedene Fraktionen auf sieben verschiedenen Planetentypen, und die Fraktionen sind an ihre eigenen Heimatplaneten gebunden. Um sich zu entwickeln und zu wachsen, müssen sie daher benachbarte Planeten in ihre Heimatumgebungen terraformen, im Wettstreit mit den anderen Gruppen. Zusätzlich können Gaia-Planeten von allen Fraktionen zur Kolonisierung genutzt werden, und Transdimensionale Planeten können in Gaia-Planeten umgewandelt werden.

Alle Fraktionen können ihre Fähigkeiten in sechs verschiedenen Entwicklungsbereichen verbessern: Terraforming, Navigation, Künstliche Intelligenz, Gaiaforming, Wirtschaft, Forschung; was zu fortschrittlicher Technologie und besonderen Boni führt. Um all dies zu tun, verfügt jede Gruppe über besondere Fähigkeiten.

Das Spielfeld besteht aus zehn Sektoren, was einen variablen Aufbau und damit einen noch größeren Wiederspielwert ermöglicht als beim Vorgänger Terra Mystica. Eine Zweispielerpartie wird auf sieben Sektoren ausgetragen.

- Beschreibung des Verlags'),
(418059, 'de', 'In SETI: Search for Extraterrestrial Intelligence leitet ihr eine wissenschaftliche Einrichtung, deren Aufgabe es ist, nach Spuren von Leben jenseits des Planeten Erde zu suchen. Das Spiel lässt sich von aktuellen oder aufkommenden Technologien und Bemühungen der Weltraumforschung inspirieren. Die Spieler erkunden nahe Planeten und ihre Monde, indem sie Sonden von der Erde aus starten und dabei die sich ständig verändernden Planetenpositionen ausnutzen. Entscheidet, ob ihr auf ihrer Oberfläche landet, um wertvolle Proben zu sammeln, oder in der Umlaufbahn bleibt, um eine breitere Untersuchung durchzuführen. Indem ihr eure Teleskope zudem auf entfernte Sternensysteme richtet, könnt ihr Spuren außerirdischer Signale oder unentdeckter Exoplaneten aufspüren und vielversprechende Daten sammeln, um sie zu Hause zu untersuchen.

Zurück auf der Erde könnt ihr in die Modernisierung eurer Ausrüstung investieren, um eingehende Daten effizienter zu analysieren, die Signalkapazität eurer Teleskope zu steigern oder euren Ressourcenvorrat zu erhöhen - alles, um den Umfang eurer Suche zu erweitern, die zur Entdeckung außerirdischer Lebensformen führen könnte. Spuren außerirdischen Lebens zu finden, ist nur eine Frage der Zeit - nutzt eure verfügbaren Ressourcen strategisch, und ihr könntet am Ende denjenigen darstellen, der den größten wissenschaftlichen Beitrag zum besseren Verständnis außerirdischen Lebens in unserer Galaxie leistet.

Ihr nutzt außerdem über 200 Karten, um eure Bemühungen zu unterstützen oder eure Forschung für zusätzliche Boni und Belohnungen in eine bestimmte Richtung zu lenken. Jede Karte hat einzigartige Effekte und Illustrationen und zeigt reale Technologien, Projekte und Entdeckungen (wie die ISS, den Large Hadron Collider, den Perseverance-Rover, die Voyager-Sonde und vieles mehr).

Das Spiel wird über fünf Runden gespielt. Der Spieler mit dem Startspielermarker beginnt jede Runde. Die Spieler sind im Uhrzeigersinn an der Reihe, wobei bereits gepasste Spieler übersprungen werden. Am Ende von Runde 5 wird die Endwertung berechnet, und der Spieler mit den meisten Punkten gewinnt.

SETI: Search for Extraterrestrial Intelligence würdigt die Raum- und Planetenforschung, die Astronomie, die anhaltende Suche nach Lebenszeichen in den Weiten des Weltalls und die Bemühungen, die Natur des Lebens im Universum zu verstehen.

- Beschreibung des Verlags'),
(338960, 'de', 'Slay the Spire: The Board Game ist ein kooperatives Deckbau- und Dungeon-Crawler-Abenteuer. Baut ein einzigartiges Deck, trefft auf bizarre Kreaturen, entdeckt Relikte immenser Macht und werdet schließlich stark genug, um den Turm (Spire) zu bezwingen!

Jeder Spieler beginnt mit einem Charakter mit einzigartigen Fähigkeiten und einem einfachen Kartendeck, das im Spielverlauf durch Hinzufügen und Entfernen von Karten verbessert werden kann. Slay the Spire ist zudem ein Rogue-like. Das bedeutet: Wenn ihr sterbt (und ihr werdet sterben!), beginnt ihr von vorne. Nehmt die gelernten Lektionen mit und versucht es erneut!

Das Spiel ist in Akte unterteilt. Am Ende eines Akts könnt ihr weiterspielen, aufhören und das Abenteuer dort beenden, oder speichern und ein anderes Mal fortsetzen!

Besiegen die Spieler den letzten Boss, gewinnen sie das Spiel! Welcher Boss als letzter gilt, hängt davon ab, wie viele Akte ihr spielen möchtet. Ihr könnt am Ende jedes Akts aufhören zu spielen! Sinkt die Lebenspunkteanzeige eines Spielers auf 0, ist er tot, und die Gruppe verliert das Spiel.'),
(12333, 'de', 'Nun ruft die Trompete uns wieder, nicht als Ruf zu den Waffen, obwohl Waffen wir brauchen; nicht als Ruf zur Schlacht, obwohl umkämpft wir sind - sondern als Ruf, die Last eines langen Dämmerkampfes zu tragen. - John F. Kennedy

1945 stürzten unwahrscheinliche Verbündete Hitlers Kriegsmaschine, während die verheerendsten Waffen der Menschheit das Japanische Kaiserreich in einem Feuersturm in die Knie zwangen. Wo einst viele Großmächte standen, standen nun nur noch zwei. Anders als die titanischen Kämpfe der vorangegangenen Jahrzehnte wurde dieser Konflikt nicht in erster Linie von Soldaten und Panzern ausgetragen, sondern von Spionen und Politikern, Wissenschaftlern und Intellektuellen, Künstlern und Verrätern.

Twilight Struggle ist ein Zweispielerspiel, das den fünfundvierzigjährigen Tanz aus Intrigen, Prestige und gelegentlichen Kriegsausbrüchen zwischen der Sowjetunion und den Vereinigten Staaten simuliert. Das Spiel beginnt inmitten der Trümmer Europas, als die beiden neuen "Supermächte" sich um die Überreste des Zweiten Weltkriegs streiten, und endet 1989.

Twilight Struggle erbt seine grundlegenden Systeme von We the People und Hannibal: Rome vs. Carthage. Es ist ein schnell zu spielendes, wenig komplexes Spiel in dieser Tradition. Der Spielplan ist eine Weltkarte jener Zeit, auf der die Spieler Einheiten bewegen und Einfluss ausüben, um Verbündete und Kontrolle für ihre Supermacht zu gewinnen. Die Entscheidungsfindung ist eine Herausforderung: Wie nutzt man am besten seine Karten und Einheiten bei stets begrenzten Ressourcen? Ereigniskarten fügen Details und Atmosphäre hinzu.

Es gibt mehrere Wege, in Twilight Struggle einen automatischen Sieg zu erringen. Hat aber keine Seite bis zum Ende von Runde 10 einen Sieg irgendeiner Art errungen, werden die Punkte zusammengezählt, und der Spieler mit den meisten Punkten gewinnt.'),
(84876, 'de', 'Das Spiel spielt in der Region Burgund im hochmittelalterlichen Frankreich. Jeder Spieler übernimmt die Rolle eines Adligen, der zunächst über ein kleines Fürstentum herrscht. Während des Spiels wollen sie Siedlungen und mächtige Burgen errichten, Handel entlang des Flusses treiben, Silberminen ausbeuten und das Wissen von Reisenden nutzen. Im Spiel nehmen die Spieler Siedlungsplättchen vom Spielplan und platzieren sie in ihrem Fürstentum, das durch das Spielertableau dargestellt wird. Jedes Plättchen hat eine Funktion, die einsetzt, sobald das Plättchen im Fürstentum platziert wird. Das Fürstentum selbst besteht aus mehreren Regionen, von denen jede einen eigenen Typ von Siedlungsplättchen verlangt.

Das Spiel wird in fünf Phasen gespielt, die jeweils aus fünf Runden bestehen. Jede Phase beginnt damit, dass der Spielplan mit Siedlungs- und Warenplättchen bestückt wird. Zu Beginn jeder Runde würfeln alle Spieler mit ihren beiden Würfeln, und der Spieler, der aktuell als Erster an der Reihe ist, würfelt zusätzlich mit dem Warenwürfel. Gemäß dem Wurf des Warenwürfels wird ein Warenplättchen auf dem Spielplan verfügbar gemacht.

In jeder Runde darf ein Spieler zwei der vier möglichen Aktionsarten ausführen:

ein Siedlungsplättchen nehmen und in den Bereitstellungsbereich seines Spielertableaus legen
ein Siedlungsplättchen aus dem Bereitstellungsbereich nehmen und in die entsprechende Region für diesen Plättchentyp legen, angrenzend an ein zuvor platziertes Siedlungsplättchen
Waren mit einer Zahl liefern, die einem seiner Würfel entspricht
Arbeitermarker nehmen, mit denen der Spieler seinen Würfelwurf anpassen kann

Zusätzlich zu diesen Aktionen darf ein Spieler ein Siedlungsplättchen kaufen und in den Bereitstellungsbereich seines Spielertableaus legen.

Das Spiel endet, nachdem die fünfte Phase vollständig gespielt wurde. Siegpunkte werden für ungenutztes Geld, ungenutzte Arbeiter und nicht gelieferte Waren vergeben. Bonuspunkte durch bestimmte Siedlungsplättchen werden am Spielende vergeben. Der Spieler mit den meisten Siegpunkten gewinnt.

Die Regeln enthalten eine Grund- und eine Fortgeschrittenenversion.'),
(182028, 'de', 'Through the Ages: A New Story of Civilization ist die Neuauflage von Through the Ages: A Story of Civilization mit vielen kleinen und großen Änderungen an den Karten über die drei Zeitalter hinweg und umfangreichen Änderungen am Militärsystem.

Through the Ages (TTA) ist ein Zivilisationsaufbauspiel. Jeder Spieler versucht, durch sorgfältiges Ressourcenmanagement die beste Zivilisation aufzubauen: durch die Entdeckung neuer Technologien, die Wahl fähiger Anführer, den Bau von Wundern und die Pflege eines starken Militärs. Schwächen in jedem Bereich können von den Gegnern ausgenutzt werden. Das Spiel erstreckt sich über die Zeitalter, beginnend in der Antike und endend im modernen Zeitalter.

Einer der zentralen Mechanismen in TTA ist das Kartendraften. Technologien, Wunder und Anführer kommen ins Spiel und werden leichter zu draften, je länger sie im Spiel sind. Um eine Technologie zu nutzen, braucht ihr genug Wissenschaft, um sie zu entdecken, genug Nahrung, um eine Bevölkerung zu erzeugen, die sie bedient, und genug Ressourcen (Erz), um das Gebäude zu bauen, das sie nutzt. Während ihr die für den technologischen Fortschritt benötigten Ressourcen abwägt, müsst ihr auch ein Militär aufbauen. Militär wird auf dieselbe Weise "gebaut" wie zivile Gebäude. Spieler mit schwachem Militär werden von anderen Spielern zur Beute. Es gibt keine Karte im Spiel, sodass ihr kein Territorium verlieren könnt, aber Spieler mit stärkerem Militär stehlen Ressourcen, Wissenschaft, töten Anführer, nehmen Bevölkerung oder Kultur. Mit starkem Militär zu gewinnen ist sehr schwierig, aber mit schwachem sehr leicht zu verlieren.

Den Sieg erringt der Spieler, dessen Nation am Ende des modernen Zeitalters die meiste Kultur besitzt.'),
(421006, 'de', 'Ein dunkles Gerücht steigt aus Mordor auf. Das Auge wendet sich Mittelerde zu. Die Stunde ist gekommen. Die Gefährtenschaft ist wiedervereint. Die Helden bereiten sich auf die Schlacht vor. Werdet ihr die Gefährtenschaft des Rings spielen, um die freien Völker zu verteidigen und den Einen Ring zu zerstören? Oder werdet ihr Sauron spielen und Frodo und Sam verfolgen, während ihr eure Horden zu den Toren der feindlichen Städte schickt? Das Schicksal Mittelerdes liegt in euren Händen!

Eine Partie erstreckt sich über 3 aufeinanderfolgende, ähnlich ablaufende Kapitel.
In eurem Zug stärkt ihr eure Fähigkeiten, häuft euren Schatz an, verbreitet eure Präsenz über Mittelerde, gewinnt Völker für eure Sache oder treibt die Aufgabe des Rings voran.

Zugübersicht: In jedem Kapitel nehmen die Spieler Karten aus einer zu Rundenbeginn angeordneten Auslage aus verdeckten und offenen Karten. Ein Spieler darf eine Karte nur nehmen, wenn sie verfügbar ist, also nicht teilweise von anderen Karten bedeckt wird. Spieler können die Karte entweder spielen, ihre Kosten bezahlen und sie in ihren Auslagebereich legen, um ihren Nutzen zu erhalten, oder die Karte abwerfen und so viele Münzen aus dem Vorrat nehmen, wie das aktuelle Kapitel angibt.

Spieler können außerdem ein Wahrzeichen-Plättchen von den offenen Plättchen nehmen, dessen Kosten bezahlen und es in ihren Auslagebereich legen. Sie dürfen dann sofort eine Festungsfigur auf der entsprechenden Region des zentralen Spielplans platzieren und von deren weiteren Effekten profitieren.

Siegbedingungen: Gewinnt das Spiel sofort, indem ihr eine der 3 Siegbedingungen erfüllt:

Die Aufgabe des Rings
Für die Gefährtenschaft: Erreichen Frodo und Sam den Schicksalsberg, zerstören sie den Einen Ring, und ihr gewinnt sofort das Spiel.
Für Sauron: Fangen die Nazgûl Frodo und Sam, erbeuten sie den Einen Ring, und ihr gewinnt sofort das Spiel.

Unterstützung der Völker: Sammelt ein Spieler 6 verschiedene Volkssymbole auf seinen grünen Karten, gewinnt er die Unterstützung der Völker Mittelerdes und gewinnt sofort das Spiel.

Eroberung Mittelerdes: Ist ein Spieler in allen 7 Regionen präsent (mit einer Festung und/oder mindestens 1 Einheit), beherrscht er Mittelerde und gewinnt sofort das Spiel.

Wird bis zum Ende von Kapitel 3 keine dieser drei Siegbedingungen erfüllt, gewinnt der Spieler, der in den meisten Regionen Mittelerdes präsent ist (mit einer Festung und/oder mindestens 1 Einheit). Bei Gleichstand wird der Sieg geteilt.'),
(295770, 'de', 'Frosthaven erzählt die Geschichte eines kleinen Außenpostens weit im Norden der Hauptstadt White Oak. Es ist ein Außenposten, der kaum das raue Wetter übersteht, geschweige denn Invasionen bekannter und unbekannter Kräfte. Doch eine Gruppe von Söldnern, am Ende ihrer Kräfte, wird helfen, diese Siedlung vor der Zerstörung zu bewahren. Sie müssen sich nicht nur mit den harschen Elementen auseinandersetzen, sondern auch mit weiteren, weit gefährlicheren Bedrohungen in der gnadenlosen Kälte: den Algox, den größeren, yetiähnlichen Cousins der Inox, die aus den Bergen angreifen; Lauerern, die aus dem nördlichen Meer einströmen; und Gerüchten zufolge gibt es Maschinen, die aus eigenem Willen durch die gefrorenen Ödlande wandern. Die Söldnertruppe muss all diesen Gefahren begegnen und dabei vielleicht sogar Frieden mit diesen neuen Völkern schließen, um gemeinsam gegen noch finsterere Mächte vorzugehen.

Frosthaven ist ein eigenständiges Abenteuer vom Designer und Verlag von Gloomhaven mit sechzehn neuen Charakteren, drei neuen Völkern, mehr als zwanzig neuen Gegnern, mehr als einhundert neuen Gegenständen und einer neuen Kampagne mit 100 Szenarien. Charaktere und Gegenstände aus Gloomhaven lassen sich in Frosthaven verwenden und umgekehrt.

Zusätzlich zu den bekannten Kampfmechanismen aus Gloomhaven bietet Frosthaven weitere Elemente wie zu lösende Mysterien, ein saisonales Ereignissystem, das es zu durchleben gilt, und die Kontrolle der Spieler darüber, wie sich das provisorische Dorf ausbreitet, wobei jedes neue Gebäude neue Fortschrittswege bietet.

Frosthaven hat einen völlig neuen Satz an Gegenständen, es gibt aber einen Mechanismus, um Gegenstände aus Gloomhaven zu übertragen. Da der Außenposten von Frosthaven jedoch abgelegen liegt, dürfen diese Produkte zwar importiert werden, sind aber nicht als Standardgegenstände vorhanden. Ressourcen sind wesentlich wertvoller, und ihr müsst Gegenstände über ein Handwerkssystem herstellen, statt sie einfach zu kaufen.

- Beschreibung des Verlags'),
(193738, 'de', 'Amerika im 19. Jahrhundert: Ihr seid Rancher und treibt wiederholt eure Rinder von Texas nach Kansas City, wo ihr sie mit dem Zug verschickt. Das bringt euch Geld und Siegpunkte ein. Es versteht sich von selbst, dass ihr bei jeder Ankunft in Kansas City eure wertvollsten Rinder im Schlepptau haben wollt. Der "Great Western Trail" verlangt jedoch nicht nur, dass ihr eure Herde in gutem Zustand haltet, sondern auch, dass ihr die verschiedenen Gebäude entlang des Weges klug nutzt. Zudem könnte es eine gute Idee sein, fähiges Personal einzustellen: Cowboys, um eure Herde zu verbessern, Handwerker, um eure eigenen Gebäude zu errichten, oder Ingenieure für die wichtige Eisenbahnlinie.

Wenn ihr eure Herde geschickt verwaltet und die Chancen und Fallstricke des Great Western Trail meistert, werdet ihr sicherlich die meisten Siegpunkte erzielen und das Spiel gewinnen.

- Beschreibung des Verlags'),
(28720, 'de', 'Brass: Lancashire - ursprünglich als Brass veröffentlicht - ist ein Wirtschaftsstrategiespiel, das die Geschichte konkurrierender Baumwollunternehmer im Lancashire der industriellen Revolution erzählt. Ihr müsst eure Industrien und euer Netzwerk entwickeln, ausbauen und etablieren, um von der Nachfrage nach Eisen, Kohle und Baumwolle zu profitieren. Das Spiel wird in zwei Hälften gespielt: der Kanalphase und der Eisenbahnphase. Um zu gewinnen, erzielt die meisten Siegpunkte (SP), die am Ende jeder Phase gezählt werden. SP stammen aus euren Kanälen, Eisenbahnen und etablierten (umgedrehten) Industrieplättchen. In jeder Runde sind die Spieler gemäß der Zugreihenfolge abwechselnd an der Reihe und erhalten zwei Aktionen für Folgendes:

Ein Industrieplättchen bauen
Eine Eisenbahn oder einen Kanal bauen
Eine Industrie entwickeln
Baumwolle verkaufen
Einen Kredit aufnehmen

Am Ende eures Zuges ersetzt ihr die beiden gespielten Karten durch zwei neue vom Deck. Die Zugreihenfolge wird dadurch bestimmt, wie viel Geld ein Spieler im vorherigen Zug ausgegeben hat, wobei der Spieler mit den geringsten Ausgaben beginnt. Dieser Zugreihenfolge-Mechanismus eröffnet strategische Optionen für Spieler, die später in der Zugreihenfolge sind, und ermöglicht aufeinanderfolgende Züge.

Nachdem alle Karten zum ersten Mal gespielt wurden (die Deckgröße wird an die Spielerzahl angepasst), endet die Kanalphase, und eine Wertungsrunde beginnt. Nach der Wertung werden alle Kanäle und alle Industrien der niedrigsten Stufe aus dem Spiel entfernt, danach werden neue Karten ausgeteilt, und die Eisenbahnphase beginnt. In dieser Phase dürfen Spieler nun mehr als einen Standort in einer Stadt besetzen, und Doppelverbindungsbauten sind möglich (wenn auch teuer). Am Ende der Eisenbahnphase findet eine weitere Wertungsrunde statt, dann wird ein Gewinner gekrönt.

Die Karten begrenzen, wo ihr eure Industrien bauen, Baumwolle verkaufen oder Verbindungen bauen könnt (obwohl jede Karte zum "Entwickeln" genutzt werden kann). Das führt zu einem strategischen Timing/Horten von Karten. Ressourcen sind gemeinsam nutzbar, sodass ihr, wenn ihr eine Eisenbahnlinie baut (die Kohle erfordert), die Kohle aus der nächstgelegenen Quelle nutzen müsst - was auch die Kohlemine eines Gegners sein kann, wodurch diese Mine wiederum der Wertung (also der Nutzung) näherkommt.

Brass: Lancashire, die 2018er Ausgabe von Roxley Games, überarbeitet die ursprüngliche Warfrog-Games-Ausgabe von Brass mit neuer Grafik und neuen Komponenten sowie einigen Regeländerungen:

Die virtuellen Verbindungsregeln zwischen Birkenhead wurden optional gemacht.
Das Dreispieler-Erlebnis wurde dem Idealerlebnis mit vier Spielern angenähert, indem jede Spielhälfte um eine Runde verkürzt und das Deck sowie die entfernten Marktplättchen leicht angepasst wurden, um ein stimmigeres Erlebnis zu gewährleisten.
Zweispielerregeln wurden erstellt und sind spielbar, ohne dass ein alternativer Spielplan nötig ist.
Die Baumwollspinnerei der Stufe 1 ist nun 5 SP wert, damit sie etwas weniger schlecht ist.'),
(246900, 'de', 'Eine Partie Eclipse versetzt euch in die Kontrolle einer riesigen interstellaren Zivilisation, die mit ihren Rivalen um Erfolg konkurriert. Ihr erkundet neue Sternensysteme, erforscht Technologien und baut Raumschiffe, mit denen ihr Krieg führt. Es gibt viele mögliche Wege zum Sieg, daher müsst ihr eure Strategie nach den Stärken und Schwächen eurer Spezies planen und gleichzeitig die Vorhaben der anderen Zivilisationen im Auge behalten.

Eclipse: Second Dawn for the Galaxy ist eine überarbeitete und verbesserte Version des Eclipse-Grundspiels, das 2011 debütierte, und bietet:

Neues grafisches Design bei Beibehaltung der gelobten Symbolik der ersten Edition
Eine vollständige Reihe an Ship-Pack-1-Miniaturen
Neue Miniaturen für Antike, GCDS, Orbitalstationen und mehr
Individuelle Kunststoffeinlagen
Individuelle Kampfwürfel
Feinjustiertes Spielgefühl'),
(173346, 'de', 'In vielerlei Hinsicht ähnelt 7 Wonders Duel seinem Ursprungsspiel 7 Wonders. Über drei Zeitalter hinweg erwerben die Spieler Karten, die Ressourcen liefern oder ihre militärische bzw. wissenschaftliche Entwicklung vorantreiben, um eine Zivilisation zu entwickeln und Wunder zu vollenden. Der Unterschied bei 7 Wonders Duel ist, dass das Spiel, wie der Titel schon andeutet, ausschließlich für zwei Spieler gedacht ist.

Die Spieler draften Karten nicht gleichzeitig aus Kartenstapeln, sondern aus einer zu Rundenbeginn angeordneten Auslage aus verdeckten und offenen Karten. Ein Spieler darf eine Karte nur nehmen, wenn sie von keiner anderen bedeckt ist, sodass Timing eine Rolle spielt, ebenso wie Bonuszüge, die es erlauben, sofort eine zweite Karte zu nehmen. Wie im Originalspiel kann jede erworbene Karte gebaut, für Münzen abgeworfen oder zum Bau eines Wunders genutzt werden. Jeder Spieler beginnt zudem mit vier Wunderkarten, und der Bau eines Wunders verschafft seinem Besitzer eine besondere Fähigkeit. Es können jedoch nur sieben Wunder gebaut werden, sodass am Ende ein Spieler zu kurz kommt.

Spieler können jederzeit Ressourcen von der Bank kaufen oder im Spielverlauf Karten erhalten, die ihnen Ressourcen für zukünftige Bauten liefern; sobald sie erworben sind, steigen die Kosten für diese Ressourcen für den Gegner, was die Dominanz des Besitzers in diesem Bereich widerspiegelt.

Ihr könnt 7 Wonders Duel auf eine von drei Arten gewinnen: Jedes Mal, wenn ihr eine Militärkarte erwerbt, rückt der Militärmarker in Richtung der Hauptstadt eures Gegners vor (was euch bei bestimmten Positionen auch einen Bonus verschafft). Erreicht ihr die Hauptstadt des Gegners, gewinnt ihr sofort das Spiel. Oder wenn ihr sechs von sieben verschiedenen wissenschaftlichen Symbolen erwerbt, erreicht ihr wissenschaftliche Dominanz und gewinnt sofort. Tritt keine dieser Situationen ein, gewinnt der Spieler mit den meisten Punkten am Spielende.'),
(167355, 'de', 'Nemesis führt euch mitten hinein in das Herz des Science-Fiction-Survival-Horrors mit all seinem Schrecken. Ein Soldat feuert blindlings einen Korridor entlang, um den Vormarsch der Alien-Wesen zu stoppen. Eine Wissenschaftlerin rennt gegen die Zeit, um in ihrem provisorischen Labor eine Lösung zu finden. Ein Verräter stiehlt im allerletzten Moment die letzte Rettungskapsel. Die Eindringlinge, denen ihr auf dem Schiff begegnet, reagieren nicht nur auf den Lärm, den ihr macht, sondern entwickeln sich auch mit der Zeit weiter. Je länger das Spiel dauert, desto stärker werden sie. Während des Spiels steuert ihr eines der Besatzungsmitglieder mit einem einzigartigen Fähigkeiten-Set, einem persönlichen Kartendeck und individueller Startausrüstung. Diese Helden decken alle grundlegenden Bedürfnisse des Science-Fiction-Horrors ab. Der Wissenschaftler ist beispielsweise gut mit Computern und Forschung, wird es aber im Kampf schwer haben. Der Soldat hingegen ...

Nemesis ist ein semi-kooperatives Spiel, in dem ihr und eure Crewmitglieder auf einem von feindseligen Organismen befallenen Schiff überleben müsst. Um das Spiel zu gewinnen, müsst ihr eines der beiden Ziele erfüllen, die euch zu Spielbeginn zugeteilt wurden, und heil zurück zur Erde gelangen. Auf eurem Weg werdet ihr auf viele Hindernisse stoßen: Schwärme von Eindringlingen (so nennt die Schiffs-KI die außerirdischen Organismen), der schlechte physische Zustand des Schiffs, verborgene Absichten eurer Mitspieler und manchmal einfach grausames Schicksal.

Das Spielgefühl von Nemesis ist darauf ausgelegt, voller dramatischer Höhepunkte zu sein, die hoffentlich auch dann noch lohnend sind, wenn eure besten Pläne ruiniert werden und euer Charakter ein schreckliches Schicksal erleidet.'),
(169786, 'de', 'Es ist eine Zeit der Unruhe im Europa der 1920er-Jahre. Die Asche des ersten großen Krieges verdunkelt noch immer den Schnee. Der kapitalistische Stadtstaat, schlicht "Die Fabrik" genannt, der den Krieg mit schwer gepanzerten Mechs befeuerte, hat seine Tore geschlossen und damit die Aufmerksamkeit mehrerer benachbarter Länder auf sich gezogen.

Scythe ist ein Engine-Building-Spiel, angesiedelt in einer alternativen Geschichte der 1920er-Jahre. Es ist eine Zeit von Landwirtschaft und Krieg, gebrochenen Herzen und verrosteten Zahnrädern, Innovation und Tapferkeit. In Scythe kontrolliert jeder Spieler eine von fünf Fraktionen Osteuropas, die alle versuchen, ihr Glück zu machen und ihre Ansprüche auf das Land rund um die geheimnisvolle Fabrik geltend zu machen. Die Spieler erobern Territorium, werben neue Rekruten an, ernten Ressourcen, gewinnen Dorfbewohner, errichten Gebäude und aktivieren monströse Mechs.

Jeder Spieler beginnt das Spiel mit unterschiedlichen Ressourcen (Macht, Münzen, Kampfkraft und Popularität), einem unterschiedlichen Startort und einem geheimen Ziel. Die Startpositionen sind speziell so kalibriert, dass sie zur Einzigartigkeit jeder Fraktion und zur asymmetrischen Natur des Spiels beitragen (jede Fraktion startet immer am selben Ort). Scythe verwendet einen gestrafften Aktionsauswahl-Mechanismus (ohne Runden oder Phasen), um das Spielgeschehen zügig voranzutreiben und Wartezeiten zwischen den Zügen zu verringern. Es gibt reichlich direkten Konflikt für Spieler, die ihn suchen, aber keine Spielerelimination.

Scythe gibt den Spielern nahezu vollständige Kontrolle über ihr Schicksal. Abgesehen von der geheimen Zielkarte jedes Spielers sind die einzigen Elemente von Glück oder Variabilität die "Begegnungskarten", die die Spieler ziehen, wenn sie mit den Bewohnern neu erkundeter Länder interagieren. Jede Begegnungskarte bietet dem Spieler mehrere Optionen, sodass er das Glück des Zufalls durch seine Wahl abschwächen kann. Auch Kämpfe werden durch Entscheidungen bestimmt, nicht durch Glück oder Zufall. Jeder Teil von Scythe hat einen Engine-Building-Aspekt: Spieler können Aktionen aufwerten, um effizienter zu werden, Gebäude errichten, die ihre Position auf der Karte verbessern, neue Rekruten anwerben, um Charakterfähigkeiten zu stärken, Mechs aktivieren, um Gegner von Invasionen abzuhalten, und ihre Grenzen erweitern, um mehr und vielfältigere Ressourcen zu ernten. Diese Engine-Building-Aspekte erzeugen ein Gefühl von Schwung und Fortschritt im gesamten Spielverlauf. Die Reihenfolge, in der Spieler ihre Engines verbessern, trägt zum einzigartigen Gefühl jeder Partie bei, selbst wenn dieselbe Fraktion schon mehrfach gespielt wurde.'),
(177736, 'de', 'A Feast for Odin ist eine Saga in Form eines Brettspiels. Ihr erlebt erneut die kulturellen Errungenschaften, Handelsexpeditionen und Raubzüge jener Stämme, die wir heute als Wikinger kennen - ein Begriff, der gegen Ende des ersten Jahrtausends noch ganz anders verwendet wurde.

Wenn die Nordmänner zu einem Raubzug aufbrachen, sagten sie, sie zögen "auf Wikingfahrt". Ihre skandinavischen Vorfahren waren jedoch weit mehr als nur Piraten. Sie waren Entdecker und Staatengründer. Leif Eriksson gilt als der erste Europäer in Amerika, lange vor Kolumbus.
In dem, was man heute als Normandie kennt, wurden die Eindringlinge nicht Wikinger, sondern Normannen genannt. Einer von ihnen ist der berühmte Wilhelm der Eroberer, der 1066 England eroberte. Ihm gelang, was der König von Norwegen nur wenige Jahre zuvor nicht gelungen war: die Eroberung des englischen Throns. Der Grund, warum die Menschen dieser Zeit zu solch starken Seefahrern wurden, lag in ihrer misslichen landwirtschaftlichen Lage: Missernten verursachten große Not.

In diesem Spiel geht ihr auf Raubzüge und erkundet neue Gebiete. Ihr widmet euch außerdem der alltäglichen Aufgabe, Güter zu sammeln, um eine finanziell gesicherte Stellung in der Gesellschaft zu erreichen. Am Ende gewinnt der Spieler, dessen Besitz den größten Wert hat.

- Spielablaufbeschreibung aus der Rezension von @StoryBoardGamer:
A Feast for Odin ist ein punktegetriebenes Spiel mit einer Vielzahl von Wegen zum Sieg, bei dem Risiken gegen Belohnungen abgewogen werden. Ein wesentlicher Teil davon ist eure zentrale Halle, die satte -86 Punkte an Feldern aufweist, und ein Großteil eures Spiels besteht darin, diese mit verschiedenen Plättchen abzudecken. Ebenso können lange Hallen und Inselkolonien große Belohnungen bieten, haben aber auch eigene Nachteile.

Jedes Jahr folgt einem vertrauten Muster aus Vorbereitung, Arbeitereinsatz und dem anschließenden Erfüllen der Anforderungen eures Festmahls. Die Hauptphase jedes Jahres ist eine Arbeitereinsatz-Angelegenheit. Ihr beginnt mit einer Auswahl an Wikingern und einem großen Aktionsplan mit sage und schreibe 61 verschiedenen Optionen zur Auswahl. Diese sind von links nach rechts in einer von vier Spalten angeordnet. Jede Spalte erfordert einen weiteren Wikinger zur Aktivierung, ist dafür aber verhältnismäßig mächtiger.

Am Ende jeder Runde müsst ihr einen Festtisch mit Nahrung füllen, abwechselnd mit Pflanzen und Gemüse. Ihr habt außerdem die Gelegenheit, die wertvollen grünen und blauen Plättchen in eure Haupthalle zu legen. Die Anordnung dieser Plättchen muss bestimmten Anforderungen folgen, aber euer Hauptziel ist es, sowohl eine Reihe von Münzsymbolen abzudecken, um euer Einkommen zu erhöhen, als auch bestimmte gedruckte Symbole zu umschließen, um diese zu erzeugen.

Ihr baut eure Engine im Laufe der Zeit auf und folgt dabei einem abwechselnden Muster aus Expansion nach außen und Jagd gegenüber Entwicklung und Kultivierung. Am Ende kommt es darauf an, wie viel ihr euch zu einem bestimmten Zeitpunkt zumuten wollt und welche Risiken ihr für ihre Belohnungen einzugehen bereit seid.'),
(266507, 'de', 'Clank! Legacy: Acquisitions Incorporated erweitert den Deckbau-Spaß von Clank! um Legacy-Spielelemente! Gründet eure eigene Filiale der legendären Abenteurerfirma Acquisitions Incorporated und begleitet eure jungen Schatzjäger über mehrere Partien hinweg zu unsterblichem Konzernruhm. Euer Spielplan, euer Deck und eure Welt verändern sich, während ihr spielt, und schaffen so eine einzigartige, auf eure Abenteurergruppe zugeschnittene Kampagne. Seid gerissen, seid mutig, und vor allem: Seid bereit ...

- Beschreibung des Verlags'),
(124361, 'de', 'Vor zweitausend Jahren beherrschte das Römische Reich die Länder rund um das Mittelmeer. Mit Frieden an den Grenzen, Eintracht in den Provinzen, einheitlichem Recht und einer gemeinsamen Währung blühte die Wirtschaft auf und ließ mächtige römische Dynastien entstehen, während sie sich über zahlreiche Städte hinweg ausbreiteten. Führt eine dieser Dynastien und entsendet Kolonisten in die entlegenen Reiche des Imperiums; baut euer Handelsnetzwerk aus; und stimmt die alten Götter für ihre Gunst um - alles, um die Chance zu erhalten, siegreich hervorzugehen!

Concordia ist ein friedliches Strategiespiel wirtschaftlicher Entwicklung im römischen Zeitalter für 2-5 Spieler ab 13 Jahren. Statt auf das Glück von Würfeln oder Karten zu setzen, müssen sich die Spieler auf ihre strategischen Fähigkeiten verlassen. Behaltet eure Rivalen im Auge, um herauszufinden, welche Ziele sie verfolgen und wo ihr sie überholen könnt! Im Spiel werden Kolonisten von Rom aus ausgesandt, um sich in Städten niederzulassen, die Ziegel, Nahrung, Werkzeuge, Wein und Stoff produzieren. Jeder Spieler beginnt mit einem identischen Satz an Spielkarten und erwirbt im Spielverlauf weitere Karten. Diese Karten erfüllen zwei Zwecke:

Sie erlauben einem Spieler, Aktionen im Spielverlauf zu wählen.
Sie sind am Spielende Siegpunkte (SP) wert.

Concordia ist ein Strategiespiel, das vorausschauende Planung und die Berücksichtigung der Züge eures Gegners erfordert. Jede Partie ist anders, nicht nur wegen der wechselnden Abfolge neuer Karten im Angebot, sondern auch wegen des modularen Aufbaus der Städte. (Eine Seite des Spielplans zeigt das gesamte Römische Reich mit 30 Städten für 3-5 Spieler, während die andere das römische Italien mit 25 Städten für 2-4 Spieler zeigt.) Wenn alle Karten verkauft wurden oder nachdem der erste Spieler sein 15. Haus gebaut hat, endet das Spiel. Der Spieler mit den meisten SP von den Göttern (Jupiter, Saturnus, Mercurius, Minerva, Vesta usw.) gewinnt das Spiel.'),
(312484, 'de', 'Auf einer unbewohnten Insel in unerforschten Meeren haben Entdecker Spuren einer großen Zivilisation gefunden. Nun führt ihr eine Expedition an, um die Insel zu erkunden, verlorene Artefakte zu finden und furchteinflößenden Wächtern zu begegnen - alles auf der Suche nach den Geheimnissen der Insel.

Lost Ruins of Arnak verbindet Deckbau und Arbeitereinsatz in einem Spiel voller Erkundung, Ressourcenmanagement und Entdeckung. Zusätzlich zu den traditionellen Deckbau-Effekten können Karten auch genutzt werden, um Arbeiter einzusetzen, und neue Arbeiteraktionen werden verfügbar, während die Spieler die Insel erkunden. Manche dieser Aktionen erfordern statt Arbeitern Ressourcen, daher ist der Aufbau einer soliden Ressourcenbasis unerlässlich. Ihr seid auf nur eine Aktion pro Zug beschränkt, also wählt eure Entscheidung sorgfältig ... welche Aktion nützt euch jetzt am meisten? Und was könnt ihr euch leisten, später zu tun ... vorausgesetzt, niemand anderes ergreift die Aktion zuerst!?

Die Decks sind klein, und der Zufall im Spiel wird durch die Fülle an taktischen Entscheidungen auf dem Spielplan stark abgemildert. Mit einer Vielzahl von Arbeiteraktionen, Artefakten und Ausrüstungskarten ist der Aufbau jeder Partie einzigartig, was die Spieler ermutigt, neue Strategien zu erkunden, um der Herausforderung zu begegnen.

Entdeckt die verlorenen Ruinen von Arnak!

- Beschreibung des Verlags'),
(341169, 'de', 'Amerika im 19. Jahrhundert: Ihr seid Rancher und treibt wiederholt eure Rinder von Texas nach Kansas City, wo ihr sie mit dem Zug verschickt. Das bringt euch Geld und Siegpunkte ein. Es versteht sich von selbst, dass ihr bei jeder Ankunft in Kansas City eure wertvollsten Rinder im Schlepptau haben wollt. Der "Great Western Trail" verlangt jedoch nicht nur, dass ihr eure Herde in gutem Zustand haltet, sondern auch, dass ihr die verschiedenen Gebäude entlang des Weges klug nutzt. Zudem könnte es eine gute Idee sein, fähiges Personal einzustellen: Cowboys, um eure Herde zu verbessern, Handwerker, um eure eigenen Gebäude zu errichten, oder Ingenieure für die wichtige Eisenbahnlinie.

Wenn ihr eure Herde geschickt verwaltet und die Chancen und Fallstricke des Great Western Trail meistert, werdet ihr sicherlich die meisten Siegpunkte erzielen und das Spiel gewinnen.

Die Änderungen in der zweiten Edition:

Brandneue Grafik von Chris Quilliams
Solo-Modus: Ein neuer Herausforderer im Westen
Doppellagige Spielertableaus
Eine neue Rinderrasse: die Simmentaler
Zwei neue umkehrbare Gebäude (#11 und 12)
Zwölf Tauschmarken, erstmals in der Erweiterung "Rails of North" eingeführt, für mehr Interaktion mit anderen Spielern
Vier neue Meisterplättchen für mehr Strategie, Wiederspielwert und Herausforderungen

- Beschreibung des Verlags'),
(373106, 'de', 'Sky Team ist ein kooperatives Zweispielerspiel, in dem ihr gemeinsam als Pilot und Co-Pilot ein Flugzeug sicher landen müsst - ohne miteinander zu sprechen! Jeder Spieler verwaltet verdeckt seine eigenen Würfel und muss durch stille Zusammenarbeit die richtigen Entscheidungen treffen, um Geschwindigkeit, Höhe, Ausrichtung, Fahrwerk und Klappen richtig zu koordinieren.

Vor jeder Landung würfelt jeder Spieler geheim mit seinen Würfeln und legt sie verdeckt vor sich ab. Erst danach entscheidet ihr gemeinsam, welche Würfel auf welche Anzeigen des Cockpits gelegt werden, um das Flugzeug sicher auf die Landebahn zu bringen. Kommuniziert nur über vereinbarte Gesten und die Anordnung eurer eigenen Würfel - denn im Cockpit bleibt keine Zeit für lange Erklärungen.

Über eine Kampagne mit mehreren Flughäfen steigt die Schwierigkeit stetig an, mit Wetterbedingungen, Notfällen und anderen Herausforderungen, die eure Kommunikation und Zusammenarbeit auf die Probe stellen.'),
(205637, 'de', 'Etwas Böses regt sich in Arkham, und nur ihr könnt es aufhalten. Arkham Horror: The Card Game verwischt die traditionellen Grenzen zwischen Rollenspiel- und Kartenspielerlebnis und ist ein Living Card Game voller lovecraftscher Mysterien, Monster und Wahnsinn!

Arkham Horror: The Card Game ist ein kooperatives Spiel, in dem Ermittler zusammenarbeiten, um arkane Mysterien und Verschwörungen zu entschlüsseln und gleichzeitig die persönlichen Dämonen zu überwinden, die ihre Vergangenheit heimsuchen. Jeder Spieler übernimmt die Rolle eines einzelnen Ermittlers und baut ein Deck rund um dessen Fähigkeiten. Eine Reihe miteinander verknüpfter Szenarien bildet eine erzählerische Kampagne, durch die ein größeres Mysterium entschlüsselt wird. In jedem dieser Szenarien bewegen sich die Ermittler durch eine Reihe bedrohlicher Orte, erkunden diese, suchen nach Hinweisen, die die Geschichte vorantreiben, und versuchen, den heimtückischen Kräften des Mythos auszuweichen oder sie zu besiegen.

Jede Partie ist ein einzelnes Szenario, während dessen die Ermittler Hinweise sammeln und daran arbeiten, ein Mysterium zu entschlüsseln. Während die Ermittler im Szenario vorankommen, erreichen sie möglicherweise eine Auflösung. Typischerweise endet ein Szenario, indem entweder das Akt-Deck oder das Agenda-Deck vorangetrieben wird. Treiben die Ermittler das Akt-Deck voran, ist die Auflösung des Szenarios in der Regel günstig (und kann als "Sieg" gelten); andere Auflösungen sind meist weniger günstig und lassen die Ermittler in einer prekäreren Lage zurück. Löst eine Begegnungskarte eine Auflösung aus, haben die Spieler das Szenario abgeschlossen und schlagen im Kampagnenhandbuch den zur jeweiligen Nummer passenden Auflösungstext nach, um zu erfahren, was als Nächstes geschieht.

Die Grundspielweise im Arkham LCG ist die Kampagne, bei der die Spieler alle Szenarien bis zu einem abschließenden Ende durchspielen. Alle eure Entscheidungen und Handlungen haben Konsequenzen, die weit über die unmittelbare Auflösung des aktuellen Szenarios hinausreichen - und eure Taten können euch wertvolle Erfahrung einbringen, mit der ihr euch besser auf die Abenteuer vorbereiten könnt, die noch vor euch liegen.'),
(237182, 'de', 'Root ist ein Brettspiel des Kriegs und der Diplomatie für zwei bis vier Spieler, angesiedelt in einem großen Wald voller mächtiger Fraktionen, die um die Kontrolle kämpfen.

Führt die zerbröckelnde Katzendynastie an, während sie versucht, Recht und Ordnung im gesamten Wald durchzusetzen; befehligt die geheime Vogeldynastie, während sie mit inneren Streitigkeiten kämpft und darauf brennt, ihren rechtmäßigen Thron wiederzuerlangen; führt einen bewaffneten Aufstand aus dem Untergrund an und untergrabt die etablierten Mächte, ganz gleich, wer regiert; oder erkundet mit einer einsamen Vagabundin die Weiten des Waldes, sammelt Gegenstände und Handwerksrezepte, während sie mit oder gegen alle Fraktionen im Konflikt kämpft.

Root ist ein asymmetrisches Spiel der Waldkrieger und -diplomaten, in dem zwei bis vier Spieler um die Kontrolle über einen großen Wald kämpfen. Es kombiniert die Freude an Erkundung und Fortschritt mit hochkonfliktreicher direkter Interaktion, bei der die Spieler um Vormachtstellung kämpfen und um ihr Überleben ringen.

Jede der vier grundlegenden Fraktionen im Root-Grundspiel funktioniert vollkommen anders von den übrigen, mit eigenen Mechanismen, die den einzigartigen Charakter jeder Gruppe widerspiegeln. Die Katzendynastie muss ihre umfangreiche, aber verstreute militärische Präsenz nutzen, um Handwerksbetriebe und Verteidigungsanlagen zu errichten. Die Waldbewegung muss ihre offene Sympathie im gesamten Wald in einen wachsenden bewaffneten Aufstand verwandeln. Die Vogeldynastie muss die perfekte Balance zwischen der Ausdehnung ihres Territoriums und der Wahrung der internen Ordnung finden, um im Spielverlauf Dekrete zu erlassen. Und die Vagabundin muss die Fraktionen des Waldes für sich gewinnen oder gegen sie arbeiten, während sie Questen erfüllt und Erfahrung sammelt, um mächtiger zu werden.'),
(164928, 'de', 'Während des mittelalterlichen Treibens rund um Orléans müsst ihr eine Gefolgschaft aus Bauern, Kaufleuten, Rittern, Mönchen usw. zusammenstellen, um durch Handel, Bauwesen und Wissenschaft im mittelalterlichen Frankreich die Vorherrschaft zu erringen.

In Orléans werbt ihr Gefolgsleute an und setzt sie ein, um ihre Fähigkeiten zu nutzen. Bauern und Schiffer versorgen euch mit Geld und Waren; Ritter erweitern euren Handlungsspielraum und sichern eure Handelsexpeditionen ab; Handwerker errichten Handelsstationen und Werkzeuge, um die Arbeit zu erleichtern; Gelehrte machen Fortschritte in der Wissenschaft; Händler erschließen euch neue Orte für den Einsatz eurer Gefolgsleute; und nicht zuletzt kann es nicht schaden, sich in Klöstern zu engagieren, denn mit Mönchen an eurer Seite fallt ihr dem Schicksal deutlich seltener zum Opfer.

Ihr werdet stets mehr Aktionen ausführen wollen, als möglich ist, und es gibt viele Wege zum Sieg. Die Herausforderung besteht darin, alle Elemente bestmöglich mit eurer Strategie zu verbinden.'),
(120677, 'de', 'Terra Mystica versetzt euch in eine fantastische Welt, in der vierzehn verschiedene Fraktionen auf sieben verschiedenen Landschaftstypen leben. Jede Fraktion ist an ihre eigene Heimatlandschaft gebunden - um zu wachsen und sich zu entwickeln, müsst ihr daher benachbarte Landschaften in eure Heimatumgebung terraformen, im Wettstreit mit den anderen Fraktionen um begrenzten Platz.

Über sechs Runden hinweg baut ihr Gebäude, verbessert eure Kulttrack-Position bei den vier Kulten, erforscht mächtige Fähigkeiten in eurem Fähigkeitenbaum und ringt geschickt um die besten Landschaften auf dem Spielplan. Jede der vierzehn Fraktionen spielt sich grundlegend anders, mit eigenen Stärken, Schwächen und einer eigenen Heimatlandschaft, was für eine enorme Wiederspielbarkeit sorgt.

Am Ende jeder Runde erhaltet ihr Siegpunkte für verschiedene Errungenschaften, die je nach Runde wechseln - für den Bau von Gebäuden, den Fortschritt auf den Kulttracks oder das Bilden großer zusammenhängender Netzwerke. Am Spielende zählen zusätzlich Punkte für Ressourcen, Gebäude und Netzwerkgröße. Der Spieler mit den meisten Siegpunkten gewinnt.'),
(192135, 'de', 'Too Many Bones betritt Neuland, indem es in ein neues Genre vorstößt: das Würfelbau-Rollenspiel. Dieses Spiel stellt alles auf den Kopf, was ihr über Würfelspiele zu wissen glaubtet. Voller Strategie versetzt euch dieses fantasybasierte Rollenspiel in die Haut eines neuen Volkes und schickt euch auf ein Abenteuer in die nördlichen Territorien, um wachsende feindliche Streitkräfte und natürlich den berüchtigten "Bösewicht" aufzuspüren und zu besiegen, der für all das verantwortlich ist.

Spielt im Team oder allein in einer Solo- oder Koop-Kampagne für 1-4 Spieler. Mit über 100 einzigartigen Fähigkeitswürfeln und 4-7 wählbaren Klassen ist jeder Kampf eine eigene kleine Herausforderung, die es zu meistern gilt. Euer Abenteuer besteht aus 8-12 Kämpfen, bevor ihr euer endgültiges Ziel erreicht und euch einem von mehreren möglichen Anführern stellt, um zu gewinnen. Unterwegs müsst ihr euch mit Entscheidungen der Handlung auseinandersetzen, die euch schnell zwischen Risiko und Belohnung, Chancen und Logik abwägen lassen - mit Würfeln, die in jeden Aspekt eingewoben sind! Eure Gruppe muss außerdem weitere Entscheidungen treffen: wann ausgeruht, wann erkundet oder welche Kämpfe verfolgt werden sollen! Die Begegnungskarten bieten unterhaltsame Wendungen und etwas komische Entlastung, während sie gleichzeitig den nächsten Kampf vorbereiten.'),
(266192, 'de', 'Wingspan ist ein kompetitives, mittelschweres, kartengetriebenes Engine-Building-Brettspiel von Stonemaier Games. Es wurde von Elizabeth Hargrave entworfen und zeigt 180 Vögel, illustriert von Natalia Rojas und Ana Maria Martinez.

Ihr seid Vogelbegeisterte - Forscher, Vogelbeobachter, Ornithologen und Sammler -, die versuchen, die besten Vögel für ihr Netzwerk an Naturschutzgebieten zu entdecken und anzulocken. Jeder Vogel erweitert eine Kette mächtiger Kombinationen in einem eurer Habitate (Aktionen). Diese Habitate konzentrieren sich auf mehrere Schlüsselaspekte des Wachstums:

Erhaltet Futtermarker über spezielle Würfel in einem Futterhäuschen-Würfelturm
Legt Eier mit Eiminiaturen in verschiedenen Farben
Zieht aus Hunderten einzigartiger Vogelkarten und spielt sie aus

Gewonnen hat der Spieler mit den meisten Punkten nach 4 Runden.

- Beschreibung des Verlags

Ab der 7. Auflage enthält die Grundspielschachtel das Promo-Paket Wingspan: Swift-Start.'),
(96848, 'de', 'Mage Knight Board Game ist ein Solo-, Koop- oder Kompetitivspiel für 1-4 Spieler, in dem jeder Spieler einen mächtigen Helden - einen Mage Knight - steuert, der die Wildnis erkundet, Städte erobert und mächtige Artefakte und Zaubersprüche sammelt.

Jede Runde spielt ihr Karten aus eurer Hand aus, um Bewegung, Angriff, Einflussnahme oder andere Aktionen durchzuführen, während ihr eine sich entfaltende Karte erkundet, Ruhmpunkte sammelt und euren Helden weiterentwickelt. Kämpfe gegen Monster und Städte werden über ein detailliertes System aus Angriffs- und Verteidigungswerten sowie Kartenkombinationen ausgetragen.

Das Spiel bietet enorme Tiefe durch seine Kartenmechanik, bei der dieselbe Karte je nach eingesetzter Fähigkeit (Grund- oder verstärkte Wirkung) auf viele verschiedene Arten genutzt werden kann, was zu einem Puzzle aus Möglichkeiten in jedem Zug führt.'),
(251247, 'de', 'Im dystopischen Europa der 1930er-Jahre trieb die industrielle Revolution die Ausbeutung fossiler Ressourcen an ihre Grenzen, und nun ist die einzige Kraft, die stark genug ist, den Machthunger der gewaltigen Maschinen und des unaufhaltsamen technischen Fortschritts zu stillen, die unbegrenzte Wasserkraft der Flüsse.

Barrage ist ein Ressourcenmanagement-Strategiespiel, in dem die Spieler konkurrieren, um ihre majestätischen Staudämme zu bauen, sie zu erhöhen, um ihre Speicherkapazität zu vergrößern, und die gesamte potenzielle Energie über Druckstollen zu den Turbinen ihrer Kraftwerke zu leiten.

Jeder Spieler vertritt eines von vier internationalen Unternehmen, die Maschinen, innovative Patente und brillante Ingenieure zusammentragen, um die besten Standorte zur Nutzung des Wassers einer umkämpften Alpenregion zu beanspruchen, die von Flüssen durchzogen wird.

Über fünf Runden hinweg müssen die Spieler Energieanforderungen erfüllen, die auf einer gemeinsamen Wettbewerbsleiste dargestellt werden, sowie spezifische Anforderungen persönlicher Verträge. Gleichzeitig versuchen sie durch den Einsatz einer begrenzten Zahl an Ingenieuren, ihre Maschinen zu verbessern, um neue und effizientere Bauaktionen zu erwerben sowie besondere Gebäude mit Einzigartigkeitseffekten zu bauen und zu aktivieren, um ihre eigene Strategie voranzutreiben.'),
(321608, 'de', 'Erweiterte Ausgabe enthält die Erweiterung Crisis & Control.

Die Nation ist in Aufruhr, und ein Krieg zwischen den Klassen tobt. Die Arbeiterklasse steht vor einem zerschlagenen Sozialsystem, die Kapitalisten verlieren ihre hart erarbeiteten Gewinne, die Mittelschicht schwindet allmählich, und der Staat versinkt in einem tiefen Defizit. Inmitten all dieses Chaos kann nur eine Person Orientierung bieten ... ihr. Ergreift ihr die Seite der Arbeiterklasse und kämpft für soziale Reformen? Oder steht ihr an der Seite der Konzerne und des freien Marktes? Helft ihr der Regierung, alles zusammenzuhalten, oder versucht ihr, koste es, was es wolle, eure eigene Agenda durchzusetzen?

Hegemony ist ein asymmetrisches, politisch-ökonomisches, kartengetriebenes Brettspiel für 2-4 Spieler, das euch in die Rolle einer der sozioökonomischen Gruppen eines fiktiven Staates versetzt: die Arbeiterklasse, die Mittelschicht, die Kapitalistenklasse und den Staat selbst.

Die Arbeiterklasse kontrolliert die Arbeiter. Die Kapitalistenklasse kontrolliert die Unternehmen. Die Mittelschicht verbindet Elemente sowohl der Arbeiter- als auch der Kapitalistenklasse. Sie verfügt über Arbeiter, die in den Unternehmen der Kapitalisten arbeiten können, kann aber auch eigene, wenn auch kleinere Unternehmen aufbauen. Der Staat schließlich versucht, alle zufriedenzustellen, indem er bei Bedarf Leistungen und Subventionen gewährt, gleichzeitig aber auch versucht, durch Steuern ein stetiges Einkommen zu sichern, um keine Schulden zu machen.

Während die Spieler ihre eigenen, getrennten Ziele verfolgen, sind sie alle durch eine Reihe von Politiken eingeschränkt, die die meisten ihrer Handlungen betreffen, wie Besteuerung, Arbeitsmarkt, Außenhandel usw. Über diese Politiken abzustimmen und den eigenen Einfluss zu nutzen, um sie zu verändern, ist ebenfalls sehr wichtig. Durch sorgfältige Planung, strategische Aktionen und politisches Taktieren gebt ihr euer Bestes, um die Macht eurer Klasse zu vergrößern und eure Agenda durchzusetzen. Werdet ihr diejenigen sein, die eure Klasse zum Sieg führen?

Hegemony basiert stark auf tatsächlichen wissenschaftlichen Prinzipien wie Sozialdemokratie, Neoliberalismus, Nationalismus und Globalismus und lässt die Spieler ihre realen Anwendungen durch fesselndes Spielgeschehen erleben. Es gibt viele Wege, um Hegemonie zu erreichen - welchen werdet ihr wählen?

- Beschreibung des Verlags'),
(284378, 'de', 'Kanban EV ist eine überarbeitete Neuauflage des Spiels Kanban: Automotive Revolution, in der die Spieler die Manager einer Fabrik übernehmen, die auf die Produktion von Elektrofahrzeugen (EV) umstellt.

Als Team von Werksleitern besucht ihr täglich verschiedene Abteilungen der Fabrik, um Ressourcen zu sammeln, Fahrzeugkomponenten zu entwickeln und die Qualität aufrechtzuerhalten, während die Fabrik gleichzeitig eine ehrgeizige Umstellung von Verbrennungsmotoren auf Elektroantriebe durchläuft. Jede Runde bewegt sich euer Team gemeinsam durch die Fabrik und muss Prioritäten setzen: Erforscht ihr neue Technologien, verbessert ihr die Produktqualität, oder konzentriert ihr euch darauf, das Umstellungsprojekt voranzutreiben?

Das Spiel behält den charakteristischen Arbeitereinsatz-Mechanismus des Originals bei, bei dem sich das gesamte Team gemeinsam von Abteilung zu Abteilung bewegt, fügt aber neue Systeme rund um die Entwicklung von Elektrofahrzeugen und deren Komponenten hinzu.'),
(183394, 'de', 'In Viticulture schlüpfen die Spieler in die Rolle von Menschen im rustikalen, vormodernen Toskana, die karge Weinberge geerbt haben. Sie besitzen ein paar Grundstücke, eine alte Kelter, einen winzigen Weinkeller und drei Arbeiter. Jeder von ihnen träumt davon, als Erster sein Weingut zu einem echten Erfolg zu machen.

Die Spieler entscheiden, wie sie ihre Arbeiter über das Jahr hinweg einsetzen wollen. Jede Jahreszeit bringt andere Aufgaben auf dem Weingut mit sich, sodass die Arbeiter im Sommer und im Winter unterschiedliche Aufgaben übernehmen können. Es gibt Konkurrenz um diese Aufgaben, und oft hat der erste Arbeiter, der eine Aufgabe erreicht, einen Vorteil gegenüber nachfolgenden Arbeitern.

Zum Glück für die Weingutbesitzer lieben es die Menschen, Weingüter zu besuchen, und viele dieser Besucher sind bereit, bei ihrem Besuch mitzuhelfen, solange ihr einen Arbeiter abstellt, der sich um sie kümmert. Ihre Besuche (in Form von Karten) sind kurz, können aber sehr hilfreich sein. Mit diesen Arbeitern und Besuchern können die Weingutbesitzer ihre Weinberge erweitern, indem sie Gebäude errichten, Reben pflanzen und Weinbestellungen erfüllen - mit dem Ziel, das erfolgreichste Weingut der Toskana zu betreiben.

Viticulture Essential Edition enthält das Grundspiel von Viticulture sowie einige der beliebtesten Module aus der ursprünglichen Tuscany-Erweiterung, darunter Mamas & Papas, Fields (früher bekannt als Properties), erweiterte und überarbeitete Besucher sowie Automa-Karten für eine Solovariante, zusammen mit einigen kleineren Regeländerungen.'),
(324856, 'de', 'The Crew: Mission Deep Sea ist die Fortsetzung des preisgekrönten kooperativen Stichspiels The Crew: Die Suche nach dem neunten Planeten. In diesem neuen Abenteuer taucht die Crew in die Tiefen des Ozeans ab, um an einer wissenschaftlichen Expedition teilzunehmen.

Wie im Vorgänger müssen die Spieler gemeinsam individuelle Stichaufgaben erfüllen, ohne offen über ihre Karten zu sprechen - nur begrenzte Kommunikation über ein spezielles Hinweissystem ist erlaubt. Die Missionen werden mit der Zeit immer anspruchsvoller und führen neue Mechanismen und Herausforderungen ein, während die Crew tiefer in die Unterwasserwelt vordringt.

Mit 50 neuen Missionen bietet Mission Deep Sea ein eigenständiges Erlebnis, das keine Vorkenntnisse des ersten Spiels erfordert, aber dennoch das bewährte kooperative Stichkonzept der Reihe fortführt.'),
(521, 'de', 'Crokinole ist ein traditionelles Geschicklichkeitsspiel für zwei oder vier Spieler, das auf einem kreisförmigen Holzbrett mit 3 Ringen und einem vertieften "Bullauge" in der Mitte gespielt wird. Ein Ring aus Pfosten ist um den inneren Kreis herum angeordnet und dient als Hindernis auf dem Weg zu diesem Bereich. Die Spielsteine sind runde Holzscheiben, ähnlich wie Damesteine. Die Spieler schießen abwechselnd Scheiben über das Brett, indem sie sie mit den Fingern schnippen, mit dem Ziel, sie im höchstwertigen Ring des Bretts zu platzieren. Die höchste Punktzahl (20 Punkte) wird erzielt, wenn eine Scheibe in das vertiefte Mittelloch geschossen wird. Von außen nach innen sind die Ringe 5, 10 und 15 Punkte wert.

Als traditionelles Spiel gibt es oft viele gespielte Varianten, aber die folgende Methode basiert auf den Regeln der National Crokinole Association, die auch die Weltmeisterschaft im Crokinole regeln.

Jede zu schießende Scheibe muss auf der äußeren Begrenzung und innerhalb des Viertelkreises des schießenden Spielers platziert werden. Befinden sich keine gegnerischen Scheiben auf dem Brett, muss die geschossene Scheibe im inneren Ring landen, sonst wird sie entfernt. Befindet sich eine gegnerische Scheibe auf dem Brett, muss die geschossene Scheibe eine gegnerische Scheibe treffen, entweder direkt oder indem sie eine andere Scheibe hineinstößt. Scheiben, die im Mittelloch landen, werden entfernt und am Ende der Runde gewertet. Scheiben, die außerhalb der äußeren Begrenzung liegen oder diese nach jedem Schuss berühren, werden für die Runde aus dem Spiel entfernt.

Der Spieler mit den meisten Punkten gewinnt die Runde und erhält 2 Punkte; bei Gleichstand erhält jeder Spieler 1 Punkt. Eine "Partie" wird üblicherweise über vier Runden gespielt. Die Anzahl der "Partien" in einem Match wird vom Turnier festgelegt.

Alternativ wird bis zu einer festgelegten Punktzahl gespielt, üblicherweise erreicht der erste Spieler oder das erste Team 100 Punkte, und jede Runde wird durch Verrechnung gewertet. Erzielt beispielsweise Spieler Eins 250 und Spieler Zwei 225 Punkte, addiert Spieler Eins 25 zu seiner Gesamtpunktzahl.'),
(199792, 'de', 'Everdell ist ein Wonderland-Brettspiel, in dem Bauwerke und Charaktere zu einem lebendigen Ökosystem am Fuße eines mächtigen Baumes verschmelzen. Eine Gruppe von Waldbewohnern hat beschlossen, ihre eigene Stadt namens Everdell zu errichten, und ihr wurdet auserwählt, ihre Bemühungen anzuführen.

Mit Hilfe eures treuen Arbeiterteams sammelt ihr Ressourcen, baut Gebäude und ladet neue Bewohner ein, in eurer Stadt zu leben. Jedes Gebäude und jeder Charakter, den ihr spielt, öffnet neue Möglichkeiten, um eure Ansiedlung zu erweitern.

Everdell ist ein Arbeitereinsatz- und Tableau-Aufbauspiel, das über vier Jahreszeiten gespielt wird, wobei jede Jahreszeit neue Aktionen und Möglichkeiten eröffnet. Die Spieler konkurrieren darum, die florierendste Stadt zu errichten, während sie sorgfältig ihre begrenzten Arbeiter und Ressourcen verwalten. Am Ende des Spiels gewinnt die Stadt mit den meisten Punkten aus Gebäuden, Bewohnern, Ereignissen und weiteren Errungenschaften.'),
(366013, 'de', 'Basierend auf einfacher und intuitiver Handkartenverwaltung versetzt Heat: Pedal to the Metal die Spieler auf den Fahrersitz intensiver Autorennen, bei denen es darum geht, sich um die beste Position zu balgen, um als Erste die Ziellinie zu überqueren, während sie gleichzeitig die Geschwindigkeit ihres Autos im Blick behalten müssen, um nicht zu überhitzen. Die Wahl der richtigen Upgrades für ihr Auto hilft ihnen, die Kurven zu meistern und den Motor kühl genug zu halten, um Höchstgeschwindigkeit zu halten. Letztlich sind ihre Fahrkünste der Schlüssel zum Sieg!

Die Fahrer können in einem einzelnen Rennen antreten oder das "Meisterschaftssystem" nutzen, um eine ganze Saison an einem Spieleabend zu spielen, wobei sie vor jedem Rennen ihr Auto anpassen, um den Spitzenplatz auf dem Podium zu erobern. Sie müssen vorsichtig sein, denn Wetter, Straßenverhältnisse und Ereignisse verändern sich mit jedem Rennen und würzen ihre Meisterschaft. Die Spieler können außerdem einen Solomodus mit dem Legends-Modul genießen oder automatisierte Fahrer als zusätzliche Gegner in Mehrspielerpartien hinzufügen.

- Beschreibung des Verlags'),
(285774, 'de', 'Marvel Champions: The Card Game ist ein kooperatives Living Card Game im Marvel-Universum für 1-4 Spieler. Jeder Spieler übernimmt die Rolle eines Marvel-Helden und tritt gegen von der KI gesteuerte Schurken und deren Handlanger an, um die Welt zu retten.

Jeder Held verfügt über zwei Formen - Held und Alter Ego -, zwischen denen die Spieler wechseln können, um Heldenkraft freizusetzen oder ihre Verteidigung und Ressourcen zu erneuern. Die Spieler bauen ihre eigenen Decks aus Heldenkarten sowie einem gemeinsamen Aspekt-Deck (Gerechtigkeit, Führung, Aggression oder Schutz), das ihren Spielstil zusätzlich prägt.

Im Verlauf des Spiels bekämpfen die Spieler Handlanger und den Hauptschurken, während sie Bedrohungen im Auge behalten müssen, die anwachsen, wenn sie nicht kontrolliert werden. Gemeinsame Zusammenarbeit und die richtige Kombination von Fähigkeiten sind entscheidend, um jedes Szenario zu meistern.'),
(365717, 'de', 'Die Katakomben des Skelettdrachens Umbrok Vessna sind geheimnisvoll und gefährlich. Portale transportieren euch durch die gesamten Verliestiefen. Wegschreine bieten unerschrockenen Entdeckern gewaltige Reichtümer. Gefangene verlassen sich darauf, dass ihr sie befreit. Geister, einmal gestört, könnten euch bis in den Tod verfolgen. Trotz alledem ist es Zeit, den Spielplan hinter sich zu lassen mit Clank! Catacombs, einem eigenständigen Deckbau-Abenteuer.

Jede Fahrt in die Katakomben ist einzigartig, da ihr Plättchen legt, um das Verlies zu erschaffen. Ihr könnt nur mit dem brandneuen Verlies-Deck spielen oder Karten aus früheren Clank!-Erweiterungen einbeziehen.

Findet euer Glück (und entkommt dem Drachen!) in Clank! Catacombs.

- Beschreibung des Verlags'),
(390092, 'de', 'In Ticket to Ride Legacy: Legends of the West unternehmen die Spieler zwölf Reisen quer durch Nordamerika als Pioniere des 19. Jahrhunderts. Die Kampagne beginnt an der Ostküste, und die Spieler arbeiten sich von einem Abenteuer zum nächsten weiter nach Westen vor und begegnen dabei allerlei Herausforderungen. Wie in Ticket to Ride bleibt das Erfüllen eurer Tickets euer Hauptziel, doch ihr müsst weitere Fähigkeiten entwickeln, wenn ihr die unerwarteten Ereignisse und eure einfallsreichen Rivalen überstehen wollt. Partie für Partie, Strecke für Strecke füllt ihr kontinuierlich euren Tresor mit Einnahmen. Während die Geschichte voranschreitet, öffnet ihr Grenzboxen, die neue Regeln, Inhalte und viele weitere Überraschungen freischalten.

Im Legacy-Stil ist Legends of the West ein einzigartiges Erlebnis, geformt durch die Entscheidungen der Spieler. Jeder Spieler hat seine eigene Rolle zu spielen, wodurch er beeinflussen kann, wie sich die Geschichte um ihn herum entfaltet. Kombiniert mit sich entwickelnden Mechanismen, die sich im Spielverlauf verändern, haben die Spieler bei jedem Zusammentreffen am Spielplan ein neues Erlebnis.

Am Ende der zwölf Partien dieser Legacy-Kampagne habt ihr euer Spiel in ein einzigartiges Exemplar verwandelt, das ihr euer Leben lang weiterspielen könnt.

- Beschreibung des Verlags'),
(175914, 'de', 'Food Chain Magnate ist ein Wirtschaftssimulationsspiel, in dem die Spieler konkurrierende Fast-Food-Ketten leiten. Jeder Spieler stellt Mitarbeiter in einer Organisationsstruktur ein, wobei jeder eingestellte Mitarbeiter dauerhaft aktiv bleibt und Gehalt kostet, sobald er eingestellt wurde - es gibt keine Möglichkeit, Mitarbeiter zu entlassen.

Die Spieler bauen Restaurants, entwickeln Rezepte, betreiben Werbung und liefern Essen an Kunden auf der Karte aus, wobei sie versuchen, ein profitables Geschäft aufzubauen, bevor die begrenzten Kunden in der Nachbarschaft von der Konkurrenz abgeworben werden. Jede Einstellung eines Mitarbeiters schaltet neue Fähigkeiten in der Organisationsstruktur frei, aber auch jeder nachfolgende Mitarbeiter kostet ein höheres Gehalt, was die Spieler zwingt, sorgfältig abzuwägen, wie schnell sie expandieren.

Als eines der einflussreichsten und anspruchsvollsten Wirtschaftsspiele bekannt, bestraft Food Chain Magnate ineffiziente Entscheidungen streng und belohnt Spieler, die frühzeitig eine effiziente, profitable Struktur aufbauen, mit einem entscheidenden Vorteil im späteren Spielverlauf.'),
(247763, 'de', 'In Underwater Cities, das etwa 30-45 Minuten pro Spieler dauert, verkörpern die Spieler die mächtigsten Köpfe der Welt, die aufgrund der Überbevölkerung der Erde ausgewählt wurden, um die bestmöglichen und lebenswertesten Unterwassergebiete zu errichten.

Das Hauptprinzip des Spiels ist das Auslegen von Karten. Drei farbige Karten werden entlang des Randes des Hauptspielplans in 3 x 5 ebenfalls farbige Felder gelegt. Idealerweise können die Spieler Karten in Felder derselben Farbe legen. Dann können sie sowohl Aktionen als auch Vorteile nutzen: die im Feld auf dem Hauptspielplan dargestellte Aktion sowie den Vorteil der Karte. Aktionen und Vorteile erlauben es den Spielern, Rohstoffe aufzunehmen; Stadtkuppeln, Tunnel und Produktionsgebäude wie Farmen, Entsalzungsanlagen und Labore in ihrem persönlichen Unterwasserbereich zu bauen und aufzuwerten; ihren Marker auf der Initiativleiste zu bewegen (was für die Spielerreihenfolge in der nächsten Runde wichtig ist); die "A-Karten" des Spielers zu aktivieren; und Karten zu sammeln, sowohl besondere als auch grundlegende, die im Spielverlauf bessere Entscheidungsmöglichkeiten bieten.

Alle fast 220 Karten - ob besonders oder grundlegend - sind je nach Art und Zeitpunkt ihrer Verwendung in fünf Typen unterteilt. Die Unterwassergebiete sind beidseitig bedruckt und bieten den Spielern viele Möglichkeiten, Siegpunkte zu erzielen und am Ende zu gewinnen.'),
(414317, 'de', 'Harmonies ist ein friedliches Puzzlespiel über das Erschaffen von Landschaften und die Beheimatung von Tieren. Die Spieler bauen ihre eigenen kleinen Ökosysteme aus bunten Landschaftswürfeln - Wald, Wasser, Feld, Gebirge und mehr - und platzieren Tiere, die zu bestimmten Kombinationen dieser Landschaften passen.

Jeden Zug nehmen die Spieler Würfel von einer gemeinsamen Auslage und fügen sie ihrer eigenen sechseckigen Landschaft hinzu, wobei sie versuchen, Muster zu schaffen, die ihre Tierkarten erfüllen, und gleichzeitig Punkte für bestimmte Landschaftsformationen sammeln.

Das Spiel ist leicht zu erlernen, bietet aber durch die vielen verschiedenen Tierkarten und die Art und Weise, wie Landschaften kombiniert werden können, um Ziele zu erfüllen, erhebliche Tiefe. Der ruhige, meditative Charakter des Spiels und seine wunderschöne Präsentation machen es zu einem entspannten, aber dennoch strategisch anspruchsvollen Erlebnis.'),
(256960, 'de', 'In Pax Pamir übernehmen die Spieler die Rolle afghanischer Anführer des 19. Jahrhunderts, die nach dem Zusammenbruch des Durrani-Reichs versuchen, einen neuen Staat zu schmieden. Westliche Geschichtsschreibungen bezeichnen diese Periode oft als "Das Große Spiel" wegen der Rolle der Europäer, die versuchten, Zentralasien als Schauplatz ihrer eigenen Rivalitäten zu nutzen. In diesem Spiel werden diese Imperien strikt aus der Perspektive der Afghanen betrachtet, die versuchten, die eindringenden ferengi (Ausländer) für ihre eigenen Zwecke zu manipulieren.

Spielerisch ist Pax Pamir ein recht geradliniger Auslagen-Aufbau. Die Spieler verbringen die meisten ihrer Züge damit, Karten aus einem zentralen Markt zu kaufen und diese dann vor sich in einer einzelnen Reihe, dem sogenannten Hof, auszuspielen. Das Ausspielen von Karten fügt dem Spielplan Einheiten hinzu und gewährt Zugang zu zusätzlichen Aktionen, mit denen sich andere Spieler stören und der Spielverlauf beeinflussen lassen. Dieser letzte Punkt verdient besondere Betonung. Obwohl jeder seine eigene Kartenreihe aufbaut, bietet das Spiel viele Möglichkeiten für Spieler, sich direkt und indirekt gegenseitig zu behindern.

Um zu überleben, organisieren sich die Spieler in Koalitionen. Im Spielverlauf wird die Dominanz der verschiedenen Koalitionen bewertet, wenn eine besondere Karte, die "Dominanzprüfung", aufgelöst wird. Hat eine einzelne Koalition bei einer dieser Prüfungen eine deutliche Führung, erhalten die dieser Koalition treuen Spieler Siegpunkte basierend auf ihrem Einfluss in ihrer Koalition. Bleibt Afghanistan jedoch bei einer dieser Prüfungen fragmentiert, erhalten die Spieler stattdessen Siegpunkte basierend auf ihrer persönlichen Machtbasis.

Nach jeder Dominanzprüfung wird der Sieg überprüft, und das Spiel wird teilweise zurückgesetzt, was den Spielern einen neuen Versuch bietet, ihre Ambitionen zu verwirklichen. Das Spiel endet, wenn ein einzelner Spieler einen Vorsprung von vier oder mehr Siegpunkten erreicht oder nach der vierten und letzten Dominanzprüfung.'),
(253344, 'de', 'In Cthulhu: Death May Die, inspiriert von den Werken H. P. Lovecrafts, verkörpern ihr und eure Mitspieler Ermittler der 1920er-Jahre, die, anstatt die Ankunft der Älteren Götter zu verhindern, versuchen, diese jenseitigen Wesen zu beschwören, um ihnen ein für alle Mal ein Ende zu setzen. Ihr beginnt das Spiel wahnsinnig, und während euer langfristiges Ziel darin besteht, Cthulhu sozusagen ins Gesicht zu schießen, werdet ihr irgendwann im Spielverlauf wahrscheinlich scheitern, eure Würfelwürfe angemessen abzumildern, und euer Wahnsinn wird euch dazu bringen, etwas Schreckliches zu tun - oder vielleicht auch etwas Vorteilhaftes. Schwer zu sagen, mit Sicherheit.

Das Spiel besteht aus mehreren Episoden, die jeweils eine ähnliche Struktur aus zwei Akten haben: vor und nach der Beschwörung dessen, was auch immer ihr gerade beschwört. Stirbt ein Charakter vor der Beschwörung, endet das Spiel, und ihr verliert; sobald der Ältere Gott auf dem Spielplan ist, habt ihr weiterhin eine Chance zu gewinnen, solange einer von euch noch am Leben ist.

Die Episoden sind alle eigenständig und weder von einer bestimmten Reihenfolge noch von denselben Spielern abhängig.'),
(383179, 'de', 'Age of Innovation ist eine unabhängige Fortsetzung von Terra Mystica, die im selben universellen System spielt, aber neue Fraktionen, einen neuen Spielplan und einen modularen Fähigkeitenbaum bietet.

Wie in Terra Mystica leben die Fraktionen auf unterschiedlichen Landschaftstypen und müssen benachbarte Landschaften in ihre Heimatumgebung terraformen, um zu wachsen. Age of Innovation führt einen individuell wählbaren Fähigkeitenbaum ein, sodass jede Fraktion in jeder Partie ihre eigenen bevorzugten Fortschrittswege wählen kann, anstatt einem festen Baum zu folgen.

Über sechs Runden hinweg bauen die Spieler Gebäude, verbessern ihre Position auf den Kulttracks, erforschen Fähigkeiten in ihrem gewählten Fähigkeitenbaum und ringen um die besten Landschaften auf dem Spielplan. Der modulare Spielplan und die wählbaren Fähigkeitenbäume sorgen für erheblich mehr Variabilität als im Original.'),
(3076, 'de', 'In Puerto Rico übernehmen die Spieler die Rollen kolonialer Gouverneure auf der Insel Puerto Rico. Ziel des Spiels ist es, durch den Verschiffen von Waren nach Europa oder den Bau von Gebäuden Siegpunkte anzuhäufen.

Jeder Spieler nutzt ein eigenes kleines Tableau mit Feldern für Stadtgebäude, Plantagen und Ressourcen. Gemeinsam genutzt werden drei Schiffe, ein Handelshaus sowie ein Vorrat an Ressourcen und Dublonen.

Der Ressourcenkreislauf des Spiels besteht darin, dass die Spieler Feldfrüchte anbauen, die sie gegen Punkte oder Dublonen eintauschen. Dublonen können dann verwendet werden, um Gebäude zu kaufen, die es den Spielern erlauben, mehr Feldfrüchte zu produzieren oder ihnen andere Fähigkeiten verleihen. Gebäude und Plantagen funktionieren nur, wenn sie von Kolonisten besetzt sind.

In jeder Runde wählen die Spieler abwechselnd eine Rollenkarte von denen auf dem Tisch (wie "Händler" oder "Baumeister"). Wird eine Rolle gewählt, darf jeder Spieler die zu dieser Rolle passende Aktion ausführen. Der Spieler, der die Rolle gewählt hat, erhält zudem ein kleines Privileg dafür - wählt er beispielsweise die Rolle "Baumeister", dürfen alle Spieler ein Gebäude bauen, aber der Spieler, der die Rolle gewählt hat, darf dies in diesem Zug mit Rabatt tun. Ungenutzte Rollen erhalten am Ende jedes Zuges einen Dublonen-Bonus, sodass der nächste Spieler, der diese Rolle wählt, den damit verbundenen Bonus behalten darf. Dies ermutigt die Spieler, im Laufe einer typischen Partie alle Rollen zu nutzen.

Puerto Rico verwendet einen variablen Phasenreihenfolge-Mechanismus, bei dem am Ende eines Zuges ein "Gouverneur"-Marker im Uhrzeigersinn an den nächsten Spieler weitergegeben wird. Der Spieler mit dem Marker beginnt die Runde, indem er eine Rolle wählt und die erste Aktion ausführt.

Die Spieler erhalten Siegpunkte für den Besitz von Gebäuden, das Verschiffen von Waren und für besetzte "große Gebäude". Die angesammelten Verschiffungsmarken jedes Spielers werden verdeckt aufbewahrt und liegen in Stückelungen von eins oder fünf vor. Das verhindert, dass andere Spieler den genauen Punktestand eines Spielers ermitteln können. Waren und Dublonen liegen offen sichtbar, und ihre Gesamtmengen können jederzeit von einem Spieler erfragt werden. In den späteren Phasen des Spiels zwingt die unbekannte Anzahl und Stückelung der Verschiffungsmarken die Spieler dazu, ihre Optionen sorgfältig abzuwägen, bevor sie eine Rolle wählen, die das Spiel beenden könnte.

2011 und meist danach wurde Puerto Rico mit Puerto Rico: Expansion I - New Buildings und Puerto Rico: Expansion II - The Nobles veröffentlicht. Diese Versionen sind im anderen Spieleintrag für Puerto Rico enthalten, nicht in diesem regulären Eintrag. Einige Ausgaben von Puerto Rico geben die Spielerzahl mit 2-5 statt 3-5 an und enthalten Variantenregeln für Partien mit nur zwei Spielern.'),
(184267, 'de', 'Nach dem Erfolg unbemannter Rover-Missionen gründeten die Vereinten Nationen das Department of Operations and Mars Exploration (D.O.M.E.). Die ersten Siedler landeten im Jahr 2037 auf dem Mars, und in den Jahrzehnten nach der Errichtung des Mars-Basislagers begannen private Erkundungsunternehmen mit der Schaffung einer sich selbst versorgenden Kolonie. Als Chefastronaut eines dieser Unternehmen wollt ihr ein Pionier bei der Entwicklung der größten, fortschrittlichsten Kolonie auf dem Mars sein, indem ihr sowohl die Missionsziele von D.O.M.E. als auch die privaten Ziele eures Unternehmens erreicht. Zu Beginn seid ihr auf Nachschub von der Erde angewiesen und müsst häufig zwischen der Mars-Raumstation und der Planetenoberfläche pendeln. Während die Kolonie mit der Zeit wächst, verlagert ihr eure Tätigkeiten auf den Bau von Minen, Stromgeneratoren, Wasseraufbereitungsanlagen, Gewächshäusern, Sauerstofffabriken und Unterkünften. Euer Ziel ist es, eine sich selbst versorgende Kolonie unabhängig von jeder irdischen Organisation zu entwickeln. Dafür müsst ihr die Bedeutung von Wasser, Luft, Energie und Nahrung verstehen - die Grundvoraussetzungen zum Überleben. Wagt ihr euch an die größte Herausforderung der Menschheit heran?

On Mars wird über mehrere Runden gespielt, die jeweils aus zwei Phasen bestehen - der Kolonisierungsphase und der Shuttlephase.

Während der Kolonisierungsphase führt jeder Spieler abwechselnd einen Zug aus, in dem er Aktionen ausführt. Die verfügbaren Aktionen hängen davon ab, auf welcher Seite des Spielplans er sich befindet. Befindet ihr euch im Orbit, könnt ihr Baupläne nehmen, Technologien kaufen und entwickeln sowie Vorräte aus dem Lager entnehmen. Befindet ihr euch auf der Planetenoberfläche, könnt ihr mit euren Robotern Gebäude errichten, diese mithilfe von Bauplänen aufwerten, Wissenschaftler und neue Verträge annehmen, neue Schiffe willkommen heißen und die Planetenoberfläche mit eurem Rover erkunden. In der Shuttlephase können die Spieler zwischen der Kolonie und der Raumstation im Orbit reisen.

Alle Gebäude auf dem Mars sind voneinander abhängig, und manche sind notwendig, damit die Kolonie wachsen kann. Der Bau von Unterkünften für Kolonisten erfordert Sauerstoff; die Sauerstofferzeugung erfordert Pflanzen; das Wachstum von Pflanzen erfordert Wasser; die Gewinnung von Wasser aus Eis erfordert Energie; die Energieerzeugung erfordert den Abbau von Mineralien; und der Mineralienabbau erfordert Kolonisten. Die Verbesserung der Fähigkeit der Kolonie, jede dieser Ressourcen bereitzustellen, ist entscheidend. Während die Kolonie wächst, werden mehr Unterkünfte benötigt, damit die Kolonisten die lebensfeindlichen Bedingungen auf dem Mars überleben können.

Während des Spiels versuchen die Spieler zudem, Missionen abzuschließen. Sobald insgesamt drei Missionen abgeschlossen sind, endet das Spiel. Um zu gewinnen, müssen die Spieler zur Entwicklung der ersten Kolonie auf dem Mars beitragen. Dies wird im Spiel dadurch dargestellt, dass die Spieler Chancenpunkte (OP) sammeln. Der Spieler mit den meisten OP am Spielende wird zum Sieger erklärt.'),
(314040, 'de', 'Beschreibung des Verlags:

Vor 71 Jahren endete die Welt fast ...

Die Seuche kam aus dem Nichts und verwüstete die Welt. Die meisten starben innerhalb einer Woche. Nichts konnte sie aufhalten. Die Welt tat ihr Bestes. Es war nicht gut genug.

Seit drei Generationen leben wir, die letzten Überreste der Menschheit, auf den Meeren, auf schwimmenden Stationen namens "Häfen". Weit weg von der Seuche sind wir in der Lage, das Festland mit Nachschub zu versorgen, damit es (und wir) nicht vollständig zugrunde gehen.

Es ist uns gelungen, ein Netzwerk der größten bekannten Städte der Welt am Leben zu erhalten. Die letzten Jahre waren hart. Städte weit weg von den Häfen sind von unserem Netz abgefallen ...

Morgen bricht eine kleine Gruppe von uns auf in das, was von der Welt übrig geblieben ist. Wir wissen nicht, was wir finden werden.

Pandemic Legacy: Season 2 ist ein episches kooperatives Spiel für 2 bis 4 Spieler. Anders als die meisten anderen Spiele arbeitet dieses gegen euch. Und mehr noch: Einige eurer Handlungen in Pandemic Legacy übertragen sich auf zukünftige Partien. Keine zwei Welten werden je gleich sein!

Teil der Pandemic-Reihe.'),
(295947, 'de', 'Cascadia ist ein knobelfreudiges Plättchen-Lege- und Token-Drafting-Spiel mit den Lebensräumen und der Tierwelt des pazifischen Nordwestens.

Im Spiel legt ihr abwechselnd euer eigenes Terrain an und besiedelt es mit Wildtieren. Ihr beginnt mit drei sechseckigen Habitat-Plättchen (mit den fünf Habitattypen im Spiel), und in eurem Zug wählt ihr ein neues Habitat-Plättchen, das mit einem Tiermarker gepaart ist, legt dieses Plättchen dann neben eure anderen und platziert den Tiermarker auf einem passenden Habitat. (Jedes Plättchen zeigt 1-3 Tierarten aus den fünf Typen im Spiel, und ihr könnt höchstens einen Marker pro Habitat platzieren.) Vier Plättchen liegen aus, jeweils zufällig mit einem Tiermarker gepaart, sodass ihr das Beste aus dem Verfügbaren machen müsst - es sei denn, ihr habt einen Naturmarker zur Hand, mit dem ihr euch jedes Element frei auswählen könnt.

Idealerweise könnt ihr Habitat-Plättchen so platzieren, dass zusammenhängendes Terrain entsteht, das Fragmentierung reduziert und Wildtierkorridore schafft, vor allem, weil am Spielende die größte zusammenhängende Fläche jedes Habitattyps gewertet wird, mit einem Bonus, wenn eure Gruppe größer ist als die jedes anderen Spielers. Gleichzeitig wollt ihr eure Tiermarker so platzieren, dass ihr die Anzahl der damit erzielten Punkte maximiert, wobei die Tierziele zufällig durch eine von vier Wertungskarten pro Tierart bestimmt werden. Vielleicht wollen Falken von anderen Falken getrennt sein, während Füchse von möglichst vielen verschiedenen Tieren umgeben sein wollen und Bären paarweise auftreten möchten. Könnt ihr das schaffen?'),
(185343, 'de', 'In Anachrony übernehmt ihr die Rolle des Anführers einer der letzten Bastionen der Menschheit, nachdem eine globale Katastrophe namens der Große Kollaps die Welt verwüstet hat. Mit Hilfe fortschrittlicher Technologie und - was am wichtigsten ist - der Fähigkeit, kurzzeitig in der Zeit zurückzureisen, müsst ihr eure Fraktion aufbauen und gleichzeitig die Ursache des Kollapses verhindern.

Anachrony ist ein Arbeitereinsatz- und Ressourcenmanagement-Spiel, dessen zentraler Mechanismus die "Exotic Matter" (Chronoenergie) ist, mit der Spieler Zeitreisen unternehmen können, um Aktionen aus der Zukunft in die Gegenwart zu holen. Über mehrere Runden hinweg bauen die Spieler ihre Basis auf, erforschen Technologien, rekrutieren Spezialisten und arbeiten sowohl an individuellen als auch an gemeinsamen Zielen, um den drohenden Kollaps zu verhindern.

Das Spiel bietet mehrere Wege zum Sieg und eine tiefgreifende Interaktion zwischen den Spielern durch das gemeinsame Projekt, den Kollaps zu verhindern - gelingt dies allen Spielern gemeinsam nicht, gewinnt niemand, unabhängig von der individuellen Punktzahl.'),
(102794, 'de', 'In der Tradition seines Vorgängers (Agricola) ist Caverna: The Cave Farmers im Kern ein Arbeitereinsatzspiel mit Schwerpunkt auf Landwirtschaft. Im Spiel seid ihr der bärtige Anführer einer kleinen Zwergenfamilie, die in einer kleinen Höhle in den Bergen lebt. Ihr beginnt das Spiel mit einem Bauern und seiner Frau, und jedes Mitglied der Bauernfamilie steht für eine Aktion, die der Spieler in jedem Zug ausführen kann. Gemeinsam bewirtschaftet ihr den Wald vor eurer Höhle und grabt euch tiefer in den Berg. Ihr richtet die Höhlen als Wohnstätten für euren Nachwuchs sowie als Arbeitsräume für kleine Unternehmen ein.

Es liegt an euch, wie viel Erz ihr abbauen wollt. Ihr braucht es, um Waffen zu schmieden, die euch Expeditionen ermöglichen, um Bonusgegenstände und -aktionen zu erhalten. Beim Graben durch den Berg könnt ihr auf Wasserquellen stoßen sowie Erz- und Rubinminen finden, die euch helfen, euren Wohlstand zu vergrößern. Direkt vor eurer Höhle könnt ihr euren Wohlstand mit Landwirtschaft weiter steigern: Ihr könnt den Wald roden, um Felder zu säen und Weiden einzuzäunen, um eure Tiere zu halten. Ihr könnt auch eure Familie vergrößern, während ihr euren stetig wachsenden Hof bewirtschaftet. Am Ende gewinnt der Spieler mit dem am effizientesten entwickelten Heimtableau.

Ihr könnt auch die Solovariante dieses Spiels spielen, um euch mit den 48 verschiedenen Einrichtungsplättchen für eure Höhle vertraut zu machen.

Caverna: The Cave Farmers, das eine Spielzeit von etwa 30 Minuten pro Spieler hat, ist eine vollständige Neugestaltung von Agricola, die die Kartendecks des früheren Spiels durch einen Satz an Gebäuden ersetzt und die Möglichkeit hinzufügt, Waffen zu kaufen und Bauern auf Questen zu schicken, um weitere Ressourcen zu erhalten. Designer Uwe Rosenberg sagt, das Spiel enthalte Teile von Agricola, biete aber auch neue Ideen, insbesondere den Höhlenteil des Spielplans, wo ihr Minen bauen und nach Rubinen suchen könnt. Das Spiel enthält zudem zwei neue Tiere: Hunde und Esel.'),
(251661, 'de', 'Oathsworn ist ein Twisting-Tales-Spiel für 1-4 Spieler, in dem sich das Geschehen um narrative Entscheidungen und detailreiche Miniaturenkämpfe dreht. Das Spiel spielt im Deepwood, wo eine Freie Kompanie (die Oathsworn) für das Überleben der Menschheit gegen unnatürliche Schrecken und den Deepwood selbst kämpft.

In jeder Spielsitzung nehmen die Spieler an einem verzweigten Spielbuch teil, in dem sich die Geschichte auf eine unausweichliche Begegnung zubewegt. Die Begegnungen sind mehrphasige, skriptbasierte Bosskämpfe auf dem Begegnungsplan, bei denen die Spieler die von einer KI gesteuerten Monster und Feinde überlisten und übertrumpfen müssen. Während sich die Sitzungen aneinanderreihen, wird die Gruppe in eine tiefgreifende Legacy-Kampagne hineingezogen, in der sie Stufen, Beute und neue Verbündete für ihre Reise gewinnt.

Oathsworn bietet ein einzigartiges Push-your-luck-Kampfsystem mit explodierenden Würfeln, bei dem die Spieler stets zwischen härterem Zuschlagen und einem möglichen Fehlschlag des Angriffs abwägen müssen. Kombiniert mit einem Euro-artigen Abklingsystem namens "Battleflow" ergibt sich eine lebendige und packende Spielsitzung.

- Beschreibung des Verlags'),
(436217, 'de', 'Als Mitglieder der Gefährtenschaft und ihre Verbündeten, die sich erheben, um ihnen zu helfen, müsst ihr euch auf eine Reise begeben, die Mittelerde entweder retten oder ins Verderben stürzen kann. Navigiert durch eine von Schatten heimgesuchte Welt, in der jede Entscheidung einen neuen Pfad prägt. Die Fäden des Schicksals verweben sich, und das Schicksal der Freien Völker liegt in eurer Tapferkeit, Freundschaft und Entschlossenheit. Wird der Eine Ring ins Feuer geworfen, oder wird sich der Träger in Verzweiflung verlieren?

The Lord of the Rings: Fate of the Fellowship ist ein kooperatives Spiel, in dem jeder Spieler zwei Charaktere kontrolliert und deren einzigartige Fähigkeiten einsetzt, um Frodo zu beschützen, Feinde an entscheidenden Orten zu bekämpfen und den bedrohlichen Nazgûl sowie Saurons suchendem Auge zu entkommen.

Jeder Durchgang bietet neue Herausforderungen mit 24 verschiedenen Zielen, 14 Ereignissen und 13 spielbaren Charakteren. Das Spiel wird gewonnen, wenn die Gruppe den Einen Ring zerstört, bevor Frodo alle Hoffnung verliert.

Ein Soloabenteuer ist enthalten.

- Beschreibung des Verlags'),
(31260, 'de', 'In Agricola seid ihr ein Bauer in einer Holzhütte mit eurer Ehefrau/eurem Ehemann und wenig sonst. Anfangs darf eure Familie in einem Zug nur zwei Aktionen ausführen, eine für euch und eine für euren Partner, etwa aus der Vielzahl der Möglichkeiten auf einem Hof: Felder pflügen, Materialien sammeln, Zäune bauen und so weiter. Es gibt zahlreiche Wahlmöglichkeiten, und im Spielverlauf werden es immer mehr, da jede Runde eine neue Aktionskarte aufgedeckt wird, die eine weitere mögliche Aktion bietet. Vielleicht denkt ihr daran, Kinder zu bekommen, um mehr Arbeit zu erledigen, aber zunächst müsst ihr euer Haus erweitern, um Platz zu schaffen - und wovon werdet ihr all die kleinen Nesthäkchen ernähren?

Das Spiel unterstützt viele Komplexitätsstufen, hauptsächlich durch die Verteilung von Karten, die Kleine Verbesserungen und Berufe darstellen. In der Einsteigerversion (in der US-Ausgabe Familienvariante genannt) werden diese Karten gar nicht verwendet. Für das fortgeschrittene Spiel enthält die US-Ausgabe drei Stufen beider Kartentypen: Basis (E-Deck), Interaktiv (I-Deck) und Komplex (K-Deck), und das Regelbuch ermutigt die Spieler, mit den verschiedenen Decks und deren Mischungen zu experimentieren. Auch Zusatzdecks wie das Z-Deck und das L-Deck existieren. Jeder Spieler beginnt mit einer Hand von 7 Berufskarten (von insgesamt über 160) und 7 Kleine-Verbesserungen-Karten (von insgesamt über 140), die er im Spielverlauf einsetzen darf, sofern sie zu seiner Strategie passen.

Agricola ist ein rundenbasiertes Spiel, und die zu bewältigende Herausforderung besteht darin, dass jede verfügbare Aktion pro Runde nur von einem Spieler ausgeführt werden kann, weshalb sorgfältige Entscheidungen wichtig sind. Es gibt unzählige Strategien, von denen manche von der eigenen Kartenhand abhängen.

Der Sieger ist der Spieler mit den meisten Siegpunkten aus den Verbesserungen auf seinem Hof.

- Beschreibung ursprünglich von BoardgameNews'),
(240980, 'de', 'In der verschlafenen Stadt Ravenswood Bluff wandelt ein Dämon unter euch. Während eines höllischen Gewittersturms, Punkt Mitternacht, hallt ein markerschütternder Schrei. Die Bewohner eilen herbei, um nachzusehen, und finden den Stadterzähler ermordet auf, seinen Körper von den Zeigern der Turmuhr durchbohrt, während das Blut auf das Kopfsteinpflaster darunter tropft. Ein Dämon treibt sein Unwesen, mordet nachts und tarnt sich tagsüber in menschlicher Gestalt. Manche haben Bruchstücke von Informationen. Andere verfügen über Fähigkeiten, die das Böse bekämpfen oder die Unschuldigen schützen. Doch der Dämon und seine bösen Handlanger verbreiten Lügen, um zu verwirren und Misstrauen zu säen. Werden die guten Bewohner das Rätsel rechtzeitig lösen, um den wahren Dämon hinzurichten und sich selbst zu retten? Oder wird das Böse diese einst friedliche Stadt überrennen?

Blood on the Clocktower ist ein Bluffspiel mit Spielern in gegnerischen Teams von Gut und Böse, überwacht von einem Erzähler-Spieler, der die Handlung leitet und entscheidende Entscheidungen trifft. Ziel des Spiels ist es, die Dämonen erfolgreich zu entlarven und hinzurichten, bevor sie die Bewohner in der Überzahl sind.

Während einer "Tag"-Phase unterhalten sich die Spieler offen und flüstern sich privat zu, um Wissen auszutauschen oder Lügen zu verbreiten, was in der Hinrichtung eines Spielers gipfelt, wenn eine Mehrheit ihn des Bösen verdächtigt. Während der "Nacht" schließen die Spieler die Augen und werden nacheinander vom Erzähler geweckt, um Informationen zu sammeln, Unheil zu stiften oder zu töten.

Der Erzähler nutzt die aufwendigen Spielkomponenten, um jede Partie zu lenken, sodass andere frei spielen können, ohne Tisch oder Spielplan zu benötigen. Die Spieler bleiben bis zum Schluss mittendrin im Geschehen, selbst wenn ihre Charaktere getötet wurden, und spuken als Geister durch Ravenswood Bluff, um von jenseits des Grabes noch zu gewinnen. Kommt ihr zu spät zu einer Partie, könnt ihr nach Spielbeginn als mächtiger Reisender-Charakter mit ungewöhnlichen Talenten und fragwürdigen Loyalitäten einsteigen. Jeder Charakter verfügt über eine eigene besondere Fähigkeit, und keine zwei Spieler in einer Partie sind je derselbe Charakter.'),
(170216, 'de', '"Das Leben ist Kampf; der Kampf ist Ruhm; Ruhm ist ALLES"

In Blood Rage kontrollieren die Spieler die Krieger, den Anführer und das Schiff ihres eigenen Wikingerclans. Ragnarök ist gekommen, und es ist das Ende der Welt! Es ist die letzte Chance der Wikinger, in Ruhm und Herrlichkeit unterzugehen und sich ihren Platz in Walhalla an Odins Seite zu sichern! Als Wikinger könnt ihr einen von vielen Wegen zum Ruhm einschlagen. Ihr könnt: das Land überfallen und plündern für seine Belohnungen; eure Gegner im Kampf niederringen; Quests erfüllen; die Werte eures Clans steigern; oder sogar ruhmreich im Kampf oder durch Ragnarök selbst sterben, dem endgültigen, unausweichlichen Schicksal.

Die meisten Spielerstrategien werden von den zu Beginn jeder der drei Spielrunden (oder Zeitalter) gedrafteten Karten geleitet. Diese "Gaben der Götter" gewähren eurem Clan zahlreiche Vorteile, darunter: gesteigerte Wikingerstärke und listige Kampfstrategien, Aufwertungen für euren Clan oder sogar die Hilfe legendärer Kreaturen aus der nordischen Mythologie. Sie können auch verschiedene Quests enthalten, von der Beherrschung bestimmter Provinzen bis dahin, dass viele eurer Wikinger nach Walhalla geschickt werden. Die meisten dieser Karten sind einem der nordischen Götter zugeordnet, was auf die Art der unterstützten Strategie hindeutet. Thor beispielsweise gewährt mehr Ruhm für Siege im Kampf. Heimdall verschafft euch Weitsicht und Überraschungen. Tyr stärkt euch im Kampf, während der Trickser Loki euch für verlorene Kämpfe belohnt oder den Sieger bestraft.

Die Spieler müssen ihre Strategien während der Draftphase sorgfältig wählen, aber auch bereit sein, sich an die Strategien ihrer Gegner anzupassen und darauf zu reagieren, während sich die Aktionsphase entfaltet. Kämpfe werden nicht nur durch die Stärke der beteiligten Figuren entschieden, sondern auch durch geheim gespielte Karten. Indem ihr die Handlungen und Loyalitäten eures Gegners gegenüber bestimmten Göttern beobachtet, könnt ihr vorhersagen, welche Karte er wahrscheinlich spielen wird, und euch entsprechend vorbereiten. Kämpfe zu gewinnen ist nicht immer die beste Vorgehensweise, denn die richtige Karte kann euch noch mehr Belohnungen einbringen, wenn ihr niedergerungen werdet. Die einzige Verliererstrategie in Blood Rage besteht darin, den Kampf und einen ruhmreichen Tod zu scheuen!'),
(231733, 'de', 'Ihr seid das Oberhaupt eines angesehenen, aber in Schwierigkeiten geratenen Familiensitzes im viktorianischen England Mitte des 19. Jahrhunderts. Nach mehreren mageren Jahrzehnten sieht es mit dem Familienvermögen wieder besser aus! Euer Ziel ist es, euren Landsitz zu verbessern, um bei den wirklich einflussreichen Familien in Derbyshire besser angesehen zu sein.

Obsession ist ein Spiel über 16 bis 20 Züge, in dem die Spieler ein Deck aus viktorianischem Landadel (der britischen sozialen Oberschicht) aufbauen, ihren Landsitz durch den Erwerb von Gebäudeplättchen auf einem zentralen Baumarkt renovieren und eine umfangreiche Dienerschaft aus Butlern, Haushälterinnen, Unterbutlern, Zofen und Dienern mithilfe eines neuartigen Arbeitereinsatz-Mechanismus verwalten. Das erfolgreiche Ausrichten prestigeträchtiger gesellschaftlicher Veranstaltungen wie Fuchsjagden, Musikabende, Billard, politische Debatten und große Bälle steigert Wohlstand, Ansehen und Verbindungen eines Spielers innerhalb der Elite.

In jedem Zug wählen die Spieler ein Gebäudeplättchen, das einen Raum oder einen Außenbereich in und um ihr britisches Landhaus des 19. Jahrhunderts darstellt. Das gewählte Plättchen bestimmt, welches Ereignis ausgerichtet werden kann und welche Gäste eingeladen werden. Die Spieler müssen jedoch sorgfältig planen, um das passende Personal für die Betreuung der Veranstaltung und der Gäste zur Verfügung zu haben. Die Belohnung für Erfolg sind neue Investitionsmöglichkeiten, die eine weitere Renovierung des Landsitzes ermöglichen (Erwerb wertvollerer/mächtigerer Gebäudeplättchen), ein steigendes Ansehen in der Grafschaft, ein wachsender Kreis einflussreicher Bekanntschaften und eine größere, bestens ausgebildete Dienerschaft.

Im Spielverlauf sorgt ein Wettstreit um die Hand des begehrtesten jungen Herrn und der begehrtesten jungen Dame der Grafschaft für konkrete Renovierungs- und Ansehensziele. Der Spieler, der diese Ziele am besten erfüllt und dabei Siegpunkte sammelt, gewinnt die Hand des wohlhabenden Verehrten - und das Spiel.

- Beschreibung des Verlags'),
(182874, 'de', 'Mitten im modernen Wien der Belle Époque konkurrieren exquisite Kaffeehäuser um Gäste. Inspirierende Künstler, wichtige Politiker und Touristen aus aller Welt bevölkern Wien und brauchen ein Hotelzimmer. Dies ist eure Gelegenheit, aus eurem kleinen Kaffeehaus ein weltberühmtes Hotel zu machen. Stellt Personal ein, erfüllt die Wünsche eurer Gäste und gewinnt die Gunst des Kaisers. Nur dann wird euer Kaffeehaus zum Grand Austria Hotel.

Der Startspieler würfelt die Würfel, sortiert sie nach der gewürfelten Zahl und platziert sie auf den entsprechenden Aktionsfeldern. In einem Zug wählt ein Spieler eine der sechs Aktionen und führt sie aus. Die Anzahl der verfügbaren Würfel im entsprechenden Aktionsfeld bestimmt, wie viel der Spieler aus der Aktion erhält. Anschließend entfernt er einen der Würfel und darf zusätzliche Aktionen ausführen. Mit den verschiedenen Aktionen kann ein Spieler die benötigten Getränke und Speisen beschaffen, Zimmer vorbereiten oder Personal einstellen.

Doch kein Hotel kann ohne Gäste wachsen. Die richtige Wahl, welche Gäste angelockt werden und ihre Bestellungen erfüllt werden, bringt wichtige Bonusaktionen mit sich. Auch die Personalkarten bieten unterschiedliche Vorteile, doch das Spiel endet nach sieben Runden, und kein Spieler kann alles tun, was er möchte - wer also die richtigen Entscheidungen trifft und den besten Weg findet, Bonusaktionen zu erzeugen, gewinnt.

Mit 116 verschiedenen Karten und einem neuen Aufbau in jeder Partie bietet Grand Austria Hotel einen enormen Wiederspielwert. Jede Partie steht für sich und verlangt neue Taktiken und Strategien.'),
(161533, 'de', 'Lisboa ist ein Wirtschaftsspiel, angesiedelt im Lissabon des Jahres 1755, unmittelbar nach dem verheerenden Erdbeben, das die Stadt zerstörte. Die Spieler übernehmen die Rolle einflussreicher Familien, die für den Wiederaufbau der Stadt und die Sicherung ihres politischen und wirtschaftlichen Einflusses verantwortlich sind.

Die Spieler bauen Grundstücke wieder auf, handeln mit Waren, gewinnen Berater und navigieren durch das komplexe politische Geflecht des Wiederaufbaus. Aktionsscheiben bestimmen, was die Spieler in jedem Zug tun können, wobei die Position der Scheiben auf dem Aktionsrad die verfügbaren Optionen bestimmt.

Als mittelschweres bis schweres Euro-Spiel bietet Lisboa erhebliche strategische Tiefe durch das Zusammenspiel von Ressourcenmanagement, dem Wiederaufbau von Grundstücken und dem Wettstreit um Einfluss bei König und Klerus.'),
(367966, 'de', 'Taucht ein in die Moderne, in der unser Planet weite, miteinander verbundene Ozeanlandschaften zu einer der letzten Grenzen macht, die es zu entdecken und zu erforschen gilt. Erlebt ein neues, sich ständig veränderndes Abenteuer in dieser Fortsetzung des großen Erfolgs Endeavor: Age of Sail!

In Endeavor: Deep Sea leitet ihr ein unabhängiges Forschungsinstitut mit dem Ziel, nachhaltige Projekte zu entwickeln und das empfindliche Gleichgewicht des Meereslebens zu bewahren. Im Spielverlauf werbt ihr Fachexperten an und nutzt deren Fähigkeiten, um neue Orte zu erkunden, Tauchgebiete zu erforschen, wichtige ökologische Studien zu veröffentlichen und Schutzprojekte zu starten.

Erweitert euer Fachwissen, entwickelt euer Team und lernt so viel wie möglich über das Meer. Die Maßnahmen, die euer Institut jetzt ergreift, könnten einen gesunden Ozean und eine nachhaltige Zukunft für den Planeten bedeuten.

Endeavor: Deep Sea wurde vom selben kreativen Team entworfen, das auch für Endeavor: Age of Sail und Endeavor verantwortlich ist. Diese Ausgabe spielt in einer neuen Ära der nautischen Entdeckung, verwendet aber gestraffte Regeln, die Fans des Originalspiels vertraut sein werden.

- Beschreibung des Verlags'),
(371942, 'de', 'Der Reiher fliegt über den Himmel von Himeji, während der Daimyo vom Gipfel der Burg aus beobachtet, wie sich seine Diener bewegen. Gärtner pflegen den Teich, in dem die Koi leben, Krieger halten Wache auf den Mauern, und Höflinge drängen sich an den Toren, sehnsüchtig nach einer Audienz, die sie den innersten Kreisen des Hofes näherbringt. Fällt die Nacht, werden die Laternen entzündet, und die Arbeiter kehren zu ihrem Clan zurück.

In The White Castle kontrollieren die Spieler einen dieser Clans, um mehr Siegpunkte zu erzielen als die anderen. Dafür müssen sie Einfluss am Hof sammeln, ihre Ressourcen mutig verwalten und ihre Arbeiter zur richtigen Zeit am richtigen Ort platzieren. Die Autoren sind Sheila Santos und Israel Cendrero, das Duo Llama Dice, das auch das erfolgreiche The Red Cathedral mit Devir entworfen hat. In diesem Fall verlassen wir das Moskau Iwans des Schrecklichen, um die eindrucksvollste Festung im modernen Japan zu erkunden, die Burg Himeji, wo das Banner des Sakai-Clans unter den Befehlen des Daimyo Sakai Tadakiyo weht.

The White Castle ist ein Euro-Spiel mit Mechanismen aus Ressourcenmanagement, Arbeitereinsatz und Würfelplatzierung, um Aktionen auszuführen. Im Spielverlauf, über drei Runden, entsenden die Spieler Mitglieder ihres Clans, um die Gärten zu pflegen, die Burg zu verteidigen oder auf der gesellschaftlichen Leiter des Adels aufzusteigen. Am Ende der Partie bringen diese den Spielern auf verschiedene Weise Siegpunkte ein.

Das zentrale Tableau zeigt die Burg Himeji in ihrer vollen Pracht, unterteilt in mehrere Zonen. Die größte davon liegt im Inneren der Burg, mit dem Saal der Tausend Teppiche, wo die Höflinge gesellschaftlich aufsteigen müssen, bis sie den dem Daimyo nächsten Kreis erreichen, um seine Gunst zu genießen. Es gibt außerdem den Teich und die Gärten, geduldig gepflegt von den Gärtnern, wo jeder ungestört entspannen und die Schönheit betrachten kann. Ein weiterer wichtiger Bereich ist die Mauer und das Äußere der Burg, wo die Krieger patrouillieren und Wache halten. Schließlich finden wir den Bereich der drei Brücken, wo sich die drei Würfeltypen ansammeln, die für Aktionen genutzt werden können, sowie den persönlichen Bereich jedes Spielers, in dem er seine Ressourcen verwaltet und seinen Vorrat an Arbeitern aufbewahrt.

Mit zugänglichen Regeln und einer sehr sorgfältig gestalteten Kulisse ist The White Castle ein vielseitiger Titel, der zu unterschiedlichen Spielgruppen passt. Wie es Tradition bei Llama-Dice-Titeln ist, verbirgt sich hinter dem eleganten und schlichten Design eine beachtliche strategische Tiefe, die für die Spieler greifbar bleibt.

- Beschreibung des Verlags'),
(380607, 'de', 'Great Western Trail: New Zealand ist eine eigenständige Erweiterung der Great-Western-Trail-Reihe, die die Spieler nach Neuseeland führt, wo sie ihre Schafherden über die Nordinsel treiben, anstatt Rinder durch den amerikanischen Westen zu führen.

Wie in den vorherigen Teilen der Reihe verwalten die Spieler ihre Herde sorgfältig, während sie entlang des Weges Gebäude nutzen und Personal einstellen, um ihre Herde zu verbessern. Diese Ausgabe führt neue thematische Elemente ein, die für Neuseeland spezifisch sind, darunter Schafzucht statt Rinderzucht sowie neue Mechanismen, die die einzigartige Geografie und Geschichte der Region widerspiegeln.

Das Spiel kann eigenständig oder in Kombination mit anderen Teilen der Great-Western-Trail-Reihe gespielt werden und bietet erfahrenen Spielern der Serie ein frisches, aber vertrautes Erlebnis.'),
(221107, 'de', 'Beschreibung des Verlags:

Vor 71 Jahren endete die Welt fast ...

Die Seuche kam aus dem Nichts und verwüstete die Welt. Die meisten starben innerhalb einer Woche. Nichts konnte sie aufhalten. Die Welt tat ihr Bestes. Es war nicht gut genug.

Seit drei Generationen leben wir, die letzten Überreste der Menschheit, auf den Meeren, auf schwimmenden Stationen namens "Häfen". Weit weg von der Seuche sind wir in der Lage, das Festland mit Nachschub zu versorgen, damit es (und wir) nicht vollständig zugrunde gehen.

Es ist uns gelungen, ein Netzwerk der größten bekannten Städte der Welt am Leben zu erhalten. Die letzten Jahre waren hart. Städte weit weg von den Häfen sind von unserem Netz abgefallen ...

Morgen bricht eine kleine Gruppe von uns auf in das, was von der Welt übrig geblieben ist. Wir wissen nicht, was wir finden werden.

Pandemic Legacy: Season 2 ist ein episches kooperatives Spiel für 2 bis 4 Spieler. Anders als die meisten anderen Spiele arbeitet dieses gegen euch. Und mehr noch: Einige eurer Handlungen in Pandemic Legacy übertragen sich auf zukünftige Partien. Keine zwei Welten werden je gleich sein!

Teil der Pandemic-Reihe.'),
(255984, 'de', '"Sind euch die Sterne hier fremd?", fragte sie, und der Himmel wurde plötzlich dunkel, die Sternenmuster fremdartig und exotisch. "Dies ist das Wandernde Meer. Die Götter haben euch hierhergebracht, und ihr müsst sie wecken, wenn ihr nach Hause zurückkehren wollt."

In Sleeping Gods werdet ihr und bis zu 3 Freunde zu Kapitänin Sofi Odessa und ihrer Crew, verloren in einer fremden Welt im Jahr 1929 an Bord eures Dampfschiffs, der Manticore. Ihr müsst zusammenarbeiten, um zu überleben, exotische Inseln zu erkunden, neue Charaktere zu treffen und die Totems der Götter zu suchen, damit ihr nach Hause zurückkehren könnt.

Sleeping Gods ist ein Kampagnenspiel. Jede Sitzung kann so lange dauern, wie ihr wollt. Wenn ihr bereit für eine Pause seid, markiert ihr euren Fortschritt auf einem Reisetagebuch, sodass ihr beim nächsten Mal leicht an dieselbe Stelle im Spiel zurückkehren könnt. Ihr könnt solo oder mit Freunden durch eure Kampagne spielen. Es ist einfach, Spieler nach Belieben ein- und auszuwechseln. Euer Ziel ist es, mindestens vierzehn Totems zu finden, die überall in der Welt versteckt sind. Wie beim Lesen eines Buches werdet ihr diese Reise ein bis zwei Stunden auf einmal vollenden und dabei neue Länder, Geschichten und Herausforderungen entdecken.

Sleeping Gods ist ein Atlas-Spiel. Jede Seite des Atlas stellt nur einen kleinen Teil der Welt dar, die ihr erkunden könnt. Erreicht ihr den Rand einer Seite und wollt in derselben Richtung weiterreisen, blättert ihr einfach zu einer neuen Seite und segelt weiter.

Sleeping Gods ist ein Geschichtenbuch-Spiel. Jeder neue Ort birgt wilde Abenteuer, verborgene Schätze und lebendige Charaktere. Eure Entscheidungen beeinflussen die Charaktere und die Handlung des Spiels und können eure Chancen, nach Hause zu kommen, verbessern oder erschweren!

Willkommen in einer riesigen Welt. Eure Reise beginnt jetzt.

- Beschreibung des Verlags'),
(2651, 'de', 'Power Grid ist die überarbeitete Neuauflage des Friedemann-Friese-Kritzelspiels Funkenschlag. Es entfernt den Kritzelaspekt beim Netzausbau der Originalausgabe und behält gleichzeitig den schwankenden Rohstoffmarkt wie in Crude: The Oil Game sowie eine Auktionsrunden-Intensität, die an The Princes of Florence erinnert.

Ziel von Power Grid ist es, die meisten Städte mit Strom zu versorgen, sobald das Netzwerk eines Spielers eine vorbestimmte Größe erreicht. In dieser neuen Ausgabe markieren die Spieler bereits vorhandene Verbindungen zwischen Städten, um sie zu verbinden, und bieten dann gegeneinander um den Kauf der Kraftwerke, mit denen sie ihre Städte mit Strom versorgen.

Sobald Kraftwerke gekauft werden, werden jedoch neuere, effizientere Kraftwerke verfügbar - allein durch den Kauf gebt ihr also potenziell anderen Zugang zu überlegener Ausrüstung.

Zusätzlich müssen die Spieler die Rohstoffe (Kohle, Öl, Müll und Uran) erwerben, die zum Betrieb dieser Kraftwerke benötigt werden (mit Ausnahme der "erneuerbaren" Windkraft-/Solaranlagen, die keinen Brennstoff benötigen), was es zu einem ständigen Ringen macht, die eigenen Kraftwerke für maximale Effizienz aufzurüsten und gleichzeitig genug Vermögen zu behalten, um das eigene Netzwerk schnell zu den günstigsten Strecken hin zu erweitern.

☛ Power-Grid-FAQ - Bitte vor dem Stellen einer Regelfrage lesen! Viele Fragen werden immer wieder in den Foren gestellt ... Habt ihr eine Frage zu einer bestimmten Erweiterung, prüft bitte das Regelforum oder FAQ für diese Erweiterung.'),
(126163, 'de', 'Tzolkin: The Mayan Calendar präsentiert einen neuen Spielmechanismus: dynamischen Arbeitereinsatz. Die Spieler, die verschiedene Maya-Stämme vertreten, platzieren ihre Arbeiter auf riesigen, miteinander verbundenen Zahnrädern, und während sich die Zahnräder drehen, bringen sie die Arbeiter zu unterschiedlichen Aktionsfeldern.

In einem Zug können die Spieler entweder (a) einen oder mehrere Arbeiter auf dem niedrigsten sichtbaren Feld der Zahnräder platzieren oder (b) einen oder mehrere Arbeiter aufnehmen. Beim Platzieren von Arbeitern müssen sie Mais bezahlen, der im Spiel als Währung dient. Nehmen sie einen Arbeiter auf, führen sie bestimmte Aktionen aus, abhängig von der Position des Arbeiters. Aktionen, die "später" auf den Zahnrädern liegen, sind wertvoller, daher ist es klug, die Zeit für sich arbeiten zu lassen - doch die Spieler können ihren Zug nicht aussetzen; haben sie all ihre Arbeiter auf den Zahnrädern, müssen sie einige aufnehmen.

Das Spiel endet nach einer vollständigen Umdrehung des zentralen Tzolkin-Zahnrads. Es gibt viele Wege zum Sieg. Die Götter zu erfreuen, indem man Kristallschädel in tiefen Höhlen platziert, oder viele Tempel zu bauen, sind nur zwei dieser vielen Wege ...'),
(216132, 'de', 'Clans of Caledonia ist ein mittelschweres bis schweres Wirtschaftsspiel, angesiedelt im Schottland des 19. Jahrhunderts. In dieser Zeit vollzog Schottland den Übergang von einem landwirtschaftlichen zu einem industrialisierten Land, das stark von Handel und Export abhing. In den folgenden Jahren stieg die Nahrungsmittelproduktion erheblich an, um das Bevölkerungswachstum zu ernähren. Leinen wurde zunehmend durch die günstigere Baumwolle ersetzt, und der Schafzucht wurde große Bedeutung beigemessen. Immer mehr Brennereien wurden gegründet, und Whisky wurde zum Premium-Alkoholgetränk in Europa.

Die Spieler vertreten historische Clans mit einzigartigen Fähigkeiten und konkurrieren darum, landwirtschaftliche Güter und natürlich Whisky zu produzieren, zu handeln und zu exportieren!

Das Spiel endet nach fünf Runden. Jede Runde besteht aus drei Phasen:

Züge der Spieler
Produktionsphase
Rundenwertung

1. Die Spieler sind abwechselnd an der Reihe und führen eine von acht möglichen Aktionen aus, vom Bauen über das Aufwerten bis zum Handeln und Exportieren. Geht einem Spieler das Geld aus, passt er und erhält einen Passbonus.

2. In der Produktionsphase sammelt jeder Spieler Grundressourcen, veredelte Waren und Bargeld aus seinen auf der Spielkarte gebauten Produktionseinheiten. Jede gebaute Produktionseinheit erzeugt sichtbares Einkommen auf dem Spielertableau. Veredelte Waren erfordern die jeweilige Grundressource.

3. Die Spieler erhalten SP abhängig vom Wertungsplättchen der aktuellen Runde.

Das Spiel enthält acht verschiedene Clans, ein modulares Spielfeld mit 16 Konfigurationen, acht Hafenboni und acht Rundenwertungsplättchen.'),
(205059, 'de', 'Mansions of Madness: Second Edition ist ein vollständig kooperatives, app-gesteuertes Brettspiel voller Horror und Mysterium für ein bis fünf Spieler, das im selben Universum wie Eldritch Horror und Elder Sign spielt. Lasst euch von der immersiven App durch die verhüllten Straßen von Innsmouth und die heimgesuchten Korridore der verfluchten Villen von Arkham führen, während ihr nach Antworten und Erholung sucht. Acht mutige Ermittler stehen bereit, sich vier Szenarien voller Furcht und Mysterium zu stellen, Waffen, Werkzeuge und Informationen zu sammeln, komplexe Rätsel zu lösen und gegen Monster, Wahnsinn und Tod zu kämpfen. Öffnet die Tür und betretet diese haarsträubenden Mansions of Madness: Second Edition. Es wird mehr als bloßes Überleben brauchen, um die Übel zu besiegen, die diese Stadt terrorisieren.'),
(244521, 'de', 'In Quacks, das zunächst als Die Quacksalber von Quedlinburg erschien, spielen die Spieler Scharlatane - oder Quacksalber -, die jeweils ihr eigenes geheimes Gebräu zusammenbrauen, indem sie nach und nach Zutaten hinzufügen. Doch Vorsicht bei dem, was ihr hinzugebt, denn eine Prise zu viel von diesem oder jenem verdirbt die ganze Mischung!

Jeder Spieler hat seinen eigenen Beutel mit Zutatenchips. In jeder Runde ziehen sie gleichzeitig Chips aus ihren Beuteln und fügen sie ihren Kesseln hinzu. Je höher der Zahlenwert des gezogenen Chips, desto weiter wird er im wirbelnden Muster des Kessels platziert, was erhöht, wie viel der Trank wert sein wird. Reizt euer Glück so weit wie möglich aus, aber wenn ihr zu viele Kirschbomben hinzufügt, explodiert euer Kessel!

Am Ende jeder Runde erhalten die Spieler Siegpunkte und Münzen, die sie für neue Zutaten ausgeben können, abhängig davon, wie gut sie es geschafft haben, ihre Kessel zu füllen. Spieler, deren Kessel explodiert sind, müssen jedoch zwischen Punkten oder Münzen wählen - nicht beides! Der Spieler mit den meisten Siegpunkten am Ende von neun Runden gewinnt das Spiel.'),
(337627, 'de', 'Jahrhundertelang herrschten die Novarchen, Nachkommen des königlichen Hauses Novarchon, mit eiserner Faust über das feudalistische galaktische Imperium der Menschheit, das Domineum. Während dieser Zeit brachten sie erstaunliche technologische Innovationen und wissenschaftliche Fortschritte in ihr Herrschaftsgebiet. Dieser beschleunigte Fortschritt half dem Domineum, selbst die entferntesten Bereiche der bekannten Galaxie zu erreichen - und schließlich zu bewohnen -, wo neue Häuser entstanden, um die äußeren Sektoren des Imperiums zu regieren. Während das Haus Novarchon an Macht gewann, wuchs auch der religiöse Kult, der es umgab, und verkündete düstere Prophezeiungen über ein uraltes kosmisches Wesen aus einer anderen Dimension: die Voidborn.

Viele hielten es nur für einen Mythos, doch in Wahrheit war es der dunkle Einfluss der Voidborn, der den Novarchen das schiere Wissen für die rasche Expansion des Imperiums verschaffte. Während der Kult der Novarchen ewiges Leben durch das jenseitige Wesen erhoffte, war die einzige Absicht der Voidborn, ihren ewigen Hunger zu stillen. Und so öffneten sich, als das Domineum eine Größe erreicht hatte, die dem Verlangen der Voidborn entsprach, interdimensionale Risse im Herzen des Domineums, um kosmische Verderbnis freizusetzen. Während das Haus Novarchon und seine Anhänger die Voidborn willkommen hießen und in ihnen falsche Erlösung suchten, infizierte und breitete sich das Wesen aus und übernahm die Kontrolle über die inneren Welten. Nun ist es an den verbliebenen Großen Häusern, die galaktische Verderbnis zu beseitigen, zu verhindern, dass sich die Voidborn vollständig in unserer Dimension manifestieren, und letztlich das Chaos als neue Herrscher des Domineums zu überwinden.

Voidfall ist ein 4X-Weltraumspiel, das das Genre an die Tische von Euro-Enthusiasten bringt. Es verbindet die Spannung, Spielerinteraktion und tiefgreifende Reichsanpassung des 4X-Genres mit dem Ressourcenmanagement, den engen Entscheidungen und dem minimalen Glücksfaktor eines wirtschaftlichen Euro-Spiels. Gewinnt, indem ihr die Voidborn im Solo-/Koop-Modus zurückdrängt, oder indem ihr im kompetitiven Modus den Einfluss eurer Rivalen bei der Wiederherstellung des Domineums überwindet - beide Modi nutzen dasselbe Regelwerk und Spielsystem. Für Abwechslung sorgen nicht nur mehrere spielbare Häuser mit eigenen Stärken und Schwächen, sondern auch viele verschiedene Kartenaufbauten für alle Spielmodi.

Als Anführer eines aufständischen Großen Hauses durchlebt ihr drei Zyklen, jeweils mit einem spielverändernden galaktischen Ereignis, einer neuen Wertungsbedingung und einer festgelegten Anzahl an spielbaren Fokuskarten. Entscheidungen und Reihenfolge bei den Fokuskarten stehen im Mittelpunkt des Spielgeschehens. Indem ihr zwei ihrer drei wirkungsvollen Aktionen wählt, während ihr sie spielt, entwickelt und verbessert ihr Technologien; kommt auf euren drei hausspezifischen Zivilisationsleisten voran; verwaltet Infrastruktur, Bevölkerung und Produktion eurer Sektoren; und erobert neue Sektoren mit bis zu fünf verschiedenen Arten von Raumflotten. Weltraumschlachten werden entweder gegen die infizierten Streitkräfte der Voidborn ausgetragen (die auch im kompetitiven Modus als neutrale Gegner präsent sind) oder gegen andere Spieler. Anstatt sich auf das Glück eines Würfelwurfs zu verlassen, sind Kämpfe in Voidfall vollständig deterministisch und belohnen sorgfältige Vorbereitung und das Überlisten der Gegner.

- Beschreibung des Verlags'),
(266810, 'de', 'Paladins of the West Kingdom spielt in einer turbulenten Zeit der Geschichte Westfranciens, um 900 n. Chr. Trotz jüngster Bemühungen, die Stadt zu entwickeln, sind die abgelegenen Ortschaften weiterhin von Außenstehenden bedroht. Sarazenen erkunden die Grenzen, während Wikinger Reichtum und Vieh plündern. Selbst die Byzantiner aus dem Osten haben ihre dunklere Seite gezeigt. Als edle Männer und Frauen müsst ihr Arbeiter aus der Stadt versammeln, um euch gegen Feinde zu verteidigen, Befestigungen zu bauen und den Glauben im Land zu verbreiten. Glücklicherweise seid ihr nicht allein. In seiner großen Weisheit hat der König seine besten Ritter gesandt, um bei euren Bemühungen zu helfen. Also sattelt die Pferde und schärft die Schwerter. Die Paladine nähern sich.

Ziel von Paladins of the West Kingdom ist es, der Spieler mit den meisten Siegpunkten (SP) am Spielende zu sein. Punkte werden durch den Bau von Außenposten und Befestigungen, das Beauftragen von Mönchen und das Konfrontieren von Außenstehenden erzielt. Jede Runde nehmen die Spieler die Hilfe eines bestimmten Paladins in Anspruch und versammeln Arbeiter, um Aufgaben zu erledigen. Im Spielverlauf steigern die Spieler nach und nach ihren Glauben, ihre Stärke und ihren Einfluss. Diese beeinflussen nicht nur ihre Endpunktzahl, sondern bestimmen auch die Bedeutung ihrer Handlungen. Das Spiel endet nach der siebten Runde.

- Beschreibung des Verlags'),
(35677, 'de', 'In Le Havre besteht der Zug eines Spielers aus zwei Teilen: Zunächst werden neu gelieferte Waren auf die Angebotsfelder verteilt, dann wird eine Aktion ausgeführt. Als Aktion können die Spieler entweder alle Waren eines Typs von einem Angebotsfeld nehmen oder eines der verfügbaren Gebäude nutzen. Gebäudeaktionen erlauben es den Spielern, Waren aufzuwerten, zu verkaufen oder zum Bau eigener Gebäude und Schiffe zu verwenden. Gebäude sind sowohl Investitionsmöglichkeit als auch Einnahmequelle, da Spieler eine Eintrittsgebühr zahlen müssen, um Gebäude zu nutzen, die ihnen nicht gehören. Schiffe hingegen dienen hauptsächlich dazu, die Nahrung bereitzustellen, die zur Versorgung der Arbeiter benötigt wird.

Nach jeweils sieben Zügen endet die Runde: Das Vieh und Getreide der Spieler kann sich durch eine Ernte vermehren, und die Spieler müssen ihre Arbeiter versorgen. Nach einer festgelegten Anzahl an Runden darf jeder Spieler eine letzte Aktion ausführen, dann endet das Spiel. Die Spieler addieren den Wert ihrer Gebäude und Schiffe zu ihren Bargeldreserven. Der Spieler mit dem größten angehäuften Vermögen gewinnt.'),
(124742, 'de', 'Willkommen in New Angeles, der Heimat des Beanstalk. Aus unseren Zweigstellen in diesem Monument menschlicher Errungenschaft überträgt NBN stolz all eure Lieblingsmedienprogramme. Wir bieten umfassendes Streaming in Musik und Dreidee, Nachrichten und Sitcoms, klassische Filme und Sensies. Wir decken alles ab. Dies ist unser mutiges neues Zeitalter, und während die Menschheit mit einer erstaunlichen Reihe neuer Fortschritte tagtäglich in den Weltraum und in die Zukunft hineinstürzt, halten NBN und unsere Tochtergesellschaften Schritt und bringen euch alles Bewegtbild, das sich anzusehen lohnt.

Android: Netrunner ist ein asymmetrisches Living Card Game für zwei Spieler. Angesiedelt in der Cyberpunk-Zukunft von Android und Infiltration, stellt das Spiel einen Megakonzern und dessen gewaltige Ressourcen gegen die subversiven Talente einsamer Runner.

Konzerne versuchen, Agendas zu punkten, indem sie sie vorantreiben. Dafür brauchen sie Zeit und Credits. Um die Zeit und die Credits zu erlangen, die sie brauchen, müssen sie ihre Server und Datenfestungen mit "Eis" sichern. Diese Sicherheitsprogramme gibt es in verschiedenen Varianten, von einfachen Barrieren bis zu Codegates und aggressiven Wächtern. Sie dienen als virtuelle Augen, Ohren und Maschinengewehre des Konzerns auf den weitläufigen Informationsautobahnen des Netzwerks.

Im Gegenzug müssen Runner ihre Zeit und Credits darauf verwenden, sich einen ausreichenden Reichtum an Ressourcen zu verschaffen, die notwendige Hardware zu kaufen und ausreichend mächtige Eisbrecher-Programme zu entwickeln, um sich an den Sicherheitsmaßnahmen der Konzerne vorbeizuhacken. Ihre Aufträge sind immer etwas verzweifelt, getrieben von engen Zeitplänen und von Geheimnis umhüllt. Wenn ein Runner sich einklinkt und einen Lauf auf einen Konzernserver startet, riskiert er, dass seine besten Programme zerstört werden oder er von einem Verfolgungsprogramm erwischt wird und den Gegenmaßnahmen des Konzerns schutzlos ausgeliefert ist. Es ist nicht ungewöhnlich, dass ein unvorbereiteter Runner an einem üblen Wächter scheitert und dadurch massiven Hirnschaden erleidet. Selbst wenn ein Runner die Verteidigung einer Datenfestung überwindet, weiß niemand, was sie enthält. Manchmal findet der Runner etwas von Wert. Manchmal kann er bestenfalls zerstören, was der Konzern gerade entwickelte.

Der erste Spieler mit sieben Punkten gewinnt das Spiel - aber wahrscheinlich nicht, ohne vorher etwas Hirnschaden oder schlechte Publicity erlitten zu haben.

Das überarbeitete Grundspiel für Android: Netrunner, das Ende 2017 erschien, enthält Karten aus dem ursprünglichen Grundspiel von 2012 sowie Karten aus den Datenpaketreihen Genesis Cycle und Spin Cycle. Obwohl die Karten in diesem Set bereits zuvor veröffentlicht wurden, ist die Grafik einiger von ihnen neu.'),
(125153, 'de', 'Dieses Zeitalter der Kunst und des Kapitalismus hat den Bedarf an einem neuen Beruf geschaffen - dem Galeristen.

Als Mischung aus Kunsthändler, Museumskurator und Künstlermanager übernehmt ihr genau diesen Beruf! Ihr werdet Künstler fördern und unterstützen; Kunst kaufen, ausstellen und verkaufen; und euren internationalen Ruf aufbauen und geltend machen. Dadurch erlangt ihr den Respekt, der nötig ist, um Besucher aus aller Welt in eure Galerie zu locken.

Es gibt viel zu tun, aber keine Sorge, ihr könnt Assistenten anstellen, die euch helfen, eure Ziele zu erreichen. Baut euer Vermögen auf, indem ihr die lukrativste Galerie führt, und sichert euch euren Ruf als Weltklasse-Galerist!

Maximiert euer Geld und gewinnt so das Spiel durch:

Besucher in eurer Galerie zu haben;
Kunstwerke auszustellen und zu verkaufen;
in die Förderung von Künstlern zu investieren, um den Kunstwert zu steigern;
Trends und Ansehen sowie Kurator- und Händlerziele zu erreichen.'),
(200680, 'de', 'Aktualisiert und gestrafft für eine neue Generation von Spielern, bietet Agricola, das preisgekrönte und hoch angesehene Spiel von Uwe Rosenberg, ein überarbeitetes Regelbuch und Spielgefühl, Holzkomponenten sowie eine Kartenauswahl aus dem Grundspiel und seinen Erweiterungen, überarbeitet und aktualisiert für diese Ausgabe.

Das 17. Jahrhundert war keine leichte Zeit, um Bauer zu sein.
Die Spieler beginnen das Spiel mit zwei Familienmitgliedern und können ihre Familien im Spielverlauf vergrößern. Das verschafft ihnen mehr Aktionen, doch bedenkt: Ihr müsst mehr Nahrung anbauen, um eure wachsende Familie zu ernähren! Die Ernährung der Familie ist eine besondere Herausforderung, und die Spieler pflanzen Getreide und Gemüse, während sie ihre Nahrungsversorgung mit Schafen, Wildschweinen und Rindern ergänzen. Führt eure Familie zu Wohlstand, Gesundheit und Erfolg, und ihr gewinnt das Spiel.'),
(164153, 'de', 'Star Wars: Imperial Assault ist ein Strategie-Brettspiel mit taktischem Kampf und Missionen für zwei bis fünf Spieler, das zwei unterschiedliche Spielerlebnisse aus Kampf und Abenteuer im Star-Wars-Universum bietet!

Imperial Assault versetzt euch mitten in den Galaktischen Bürgerkrieg zwischen der Rebellen-Allianz und dem Galaktischen Imperium nach der Zerstörung des Todessterns über Yavin 4. In diesem Spiel könnt ihr und eure Freunde an zwei separaten Spielen teilnehmen. Das Kampagnenspiel stellt die scheinbar unbegrenzten Truppen und Ressourcen des Galaktischen Imperiums gegen ein Elite-Team von Rebellenagenten, die versuchen, den Griff des Imperiums auf die Galaxie zu brechen, während das Gefechtsspiel euch und einen Freund einlädt, Angriffstrupps aufzustellen und in direkten Duellen um widerstreitende Ziele zu kämpfen.

Im Kampagnenspiel lädt euch Imperial Assault ein, eine filmreife Geschichte im Star-Wars-Universum durchzuspielen. Ein Spieler befehligt die scheinbar unbegrenzten Armeen des Galaktischen Imperiums, die drohen, die Flamme der Rebellion für immer auszulöschen. Bis zu vier weitere Spieler werden zu Helden der Rebellen-Allianz und führen verdeckte Operationen durch, um die Pläne des Imperiums zu untergraben. Im Verlauf der Kampagne gewinnen sowohl der imperiale Spieler als auch die Rebellenhelden neue Erfahrung und Fähigkeiten, wodurch sich die Charaktere entwickeln, während sich die Geschichte entfaltet.

Imperial Assault bietet ein anderes Spielerlebnis im Gefechtsspiel. In Gefechtsmissionen tretet ihr und ein Freund in direkten, taktischen Kämpfen gegeneinander an. Ihr stellt euren eigenen Angriffstrupp aus Imperialen, Rebellen und Söldnern zusammen und baut ein Deck aus Befehlskarten, um euch in der Hitze des Gefechts einen unerwarteten Vorteil zu verschaffen. Ob ihr verlorene Holocrons bergt oder gegen eine Plünderertruppe kämpft, ihr findet in jedem Gefecht Gefahr und taktische Entscheidungen.

Als zusätzlichen Bonus enthält das Imperial-Assault-Grundspiel das Luke-Skywalker-Verbündeten-Paket und das Darth-Vader-Schurken-Paket. Diese Figurenpakete bieten geformte Kunststofffiguren sowie zusätzliche Kampagnen- und Gefechtsmissionen, in denen sowohl Luke Skywalker als auch Darth Vader in Imperial Assault im Mittelpunkt stehen.

Mit diesen und weiteren Figurenpaketen findet ihr noch mehr Missionen, in denen eure Helden an der Seite ikonischer Charaktere aus der Star-Wars-Saga kämpfen können. Boxerweiterungen fügen weitere Helden, imperiale und Söldnergruppen sowie völlig neue Kampagnen hinzu (siehe IA-Community-Wiki für eine Liste), und die kostenlose App Star Wars: Imperial Assault - Legends of the Alliance bietet euch zusätzliche Inhalte für den Solo- oder Koop-Modus.'),
(413246, 'de', 'Es gibt eine Bombe voller Drähte, und der Countdown hat begonnen ... Wen ruft ihr an? EUCH! Um die Bombe zu entschärfen, müsst ihr mit eurem Team von Bombenentschärfungsexperten zusammenarbeiten! Nutzt die Drähte auf dem Plättchenhalter vor euch, um die Drähte eurer Teamkollegen herauszufinden. Findet und durchtrennt identische Drähte, aber Vorsicht: Durchtrennt ihr einen roten Draht: BUMM! Setzt eure Ausrüstung klug ein, um den vielfältigen Herausforderungen zu begegnen, die immer schwieriger werden. Tick, tack, tick, tack ... Werdet ihr es rechtzeitig herausfinden?

In Bomb Busters gibt es einen Satz von 48 normalen Drahtkarten, nummeriert 1-12 (4 pro Wert), zusammen mit einigen gelben und roten Drahtkarten. Diese werden ausgeteilt. Jede Mission ist anders, aber euer Ziel ist immer dasselbe: kommt durch alle 12 Zahlen, ohne zu explodieren!

Die Spieler platzieren die Plättchen auf ihren Ständern und zeigen dann abwechselnd auf die Drähte der anderen und raten deren Werte. Ist die Vermutung richtig, wird der Draht durchtrennt. Ist sie falsch, rückt der Zünder vor! Gelingt es euch, alle Drähte zu durchtrennen, ohne zu explodieren - gute Arbeit, die Mission ist abgeschlossen! Explodiert die Bombe jedoch - versucht es erneut!

Mit 66 Missionen gibt es:
=> 66 verschiedene Arten zu spielen, je nach Laune (der Reihe nach, nach Schwierigkeitsgrad, Lieblingskonfiguration)
=> 66 Herausforderungen, die immer wieder gespielt werden können (auch wenn ihr schon mal in die Luft geflogen seid!)
=> Jede Menge knifflige Bomben, die immer gefährlicher werden (aber deswegen müsst ihr nicht gleich explodieren!)'),
(366161, 'de', 'Wingspan: Asia stellt die vielfältigen und lebendigen Vögel des asiatischen Kontinents vor. Wie immer ist es das Ziel, durch das Ausspielen von Vögeln, das Erreichen von Zielen und das Legen von Eiern in euren Habitaten die meisten Punkte zu erzielen. Diese Veröffentlichung erfüllt mehrere Rollen innerhalb des Wingspan-Universums!

Wingspan: Asia ist mehrere verschiedene Dinge:
- ein eigenständiges Spiel für 1 oder 2 Spieler
- ein neuer Duett-Modus für 2 Spieler, der mit dem Grundspiel oder anderen Erweiterungen kombiniert werden kann
- für 1-5 Spieler neue Vogel- und Bonuskarten zum Hinzufügen zum ursprünglichen Wingspan und seinen anderen Erweiterungen
- für 6-7 Spieler ein neuer Schwarm-Modus (der auch die Komponenten des Grundspiels benötigt)'),
(322289, 'de', 'Wenn ihr über viele lange Tage am Horizont nur die Linie erkennen könnt, die das Meer vom Himmel trennt, wird euch der Anblick einer fernen Küste, die vor euch auftaucht, vor Verständnis erschauern lassen, dass das Abenteuer nun beginnt.

Ihr findet euch überwältigt wieder, als ihr an der Küste landet, die der Ausgangspunkt einer ausgedehnten Erkundung der Galapagos-Inseln sein wird, eines magischen Ortes von unfassbarer Schönheit und endloser Biodiversität. Dort werdet ihr Repertoires sammeln und euer Wissen über die Naturwissenschaften erweitern. Eure Augen werden lernen, die verborgenen Arten im tropischen Wald zu erkennen, während sie über die unzähligen Farben und Texturen der Natur streifen. Nach inspirierenden Stunden des Studiums und erhellenden Erkenntnissen werdet ihr unter einem funkelnden Himmel ruhen und die verblüffende Komplexität des Tierreichs bewundern.

Darwin''s Journey ist ein Arbeitereinsatz-Eurospiel, in dem sich die Spieler an Charles Darwins Erinnerungen an sein Abenteuer durch die Galapagos-Inseln erinnern, das zur Entwicklung seiner Evolutionstheorie beitrug.

Mit dem innovativen Arbeiterfortschrittssystem des Spiels muss jeder Arbeiter die Disziplinen studieren, die Voraussetzung für die Ausführung mehrerer Aktionen im Spiel sind, wie Erkundung, Korrespondenz, Sammeln und Versand von auf der Insel gefundenen Repertoires an Museen, um zum menschlichen Wissen der Biologie beizutragen. Das Spiel dauert fünf Runden, und dank mehrerer kurz- und langfristiger Ziele bringt euch jede Handlung, die ihr vornehmt, auf unterschiedliche Weise Siegpunkte ein.'),
(276025, 'de', 'Maracaibo, ein Strategiespiel für 1-4 Spieler von Alexander Pfister, spielt in der Karibik des 17. Jahrhunderts. Die Spieler versuchen, ihren Einfluss in drei Nationen über vier Runden mit einer Spielzeit von 40 Minuten pro Spieler zu vergrößern.

Die Spieler segeln auf einem runden Kurs durch die Karibik, z. B. gibt es Stadtplättchen, an denen sie verschiedene Aktionen ausführen oder Waren liefern können. Eine Besonderheit ist ein implementierter Quest-Modus über weitere und verschiedene Plättchen, der dem Spieler, der ihm nachjagt, eine kleine Geschichte erzählt.

Als Spieler bewegt ihr euer Schiff um den Kurs herum und verwaltet es mit Karten wie in anderen Spielen von Alexander Pfister.

HINWEIS: Die spanische und portugiesische Ausgabe von Maracaibo enthält die Mini-Erweiterung La Armada, die in der Schachtel des Grundspiels mitgeliefert wird.'),
(332772, 'de', 'Belebt die Zivilisation wieder, 5000 Jahre nachdem alles zerstört wurde. Führt euren Stamm an und erkundet die vereiste Erde. Nutzt ihre Ressourcen. Werbt Überlebende von der Oberfläche für eure Sache an. Baut Fabriken mit mächtigen Maschinen. Und besiedelt uralte Stätten, um die vergessenen Technologien eures Stammes wiederzuerlernen.
--
Revive ist ein Spiel für 1-4 Spieler mit asymmetrischen Spielerfähigkeiten, stark variablem Aufbau und ohne Kampf oder direkten Konflikt. Das Durchspielen der fünfteiligen Kampagne schaltet zusätzliche Inhalte frei, und sobald alle Inhalte freigeschaltet sind, kann das Spiel unbegrenzt oft neu gespielt werden.

Zu Spielbeginn erhält jeder Spieler einen Satz Bürgerkarten, ein Stammestableau sowie ein riesiges, doppellagiges Spielertableau. Das Stammestableau zeigt eure einzigartige Stammesfähigkeit und die uralten Technologien, die ihr im Spielverlauf wiedererlernen könnt. Auf dem doppellagigen Spielertableau platziert ihr eure individuellen Maschinen und wertet eure Kartenslots auf.

Ein Hauptziel des Spiels ist es, die großen, uralten Stätten zu erreichen und zu besiedeln. Diese uralten Orte werden zufällig bestimmt, und da sie wichtige Quellen für Siegpunkte sind, prägen sie eure Strategie in jeder Partie anders. Das Spiel endet, wenn alle Artefakte genommen wurden, und der Spieler mit den meisten Punkten gewinnt.

In eurem Zug führt ihr zwei Aktionen aus:

Eine Karte spielen (ihr Effekt wird durch den genutzten Kartenslot bestimmt)
Erkunden (ein Gebietsplättchen aufdecken und eine neue Bürgerkarte anwerben)
Besiedeln (eine uralte Stätte besiedeln, um eine neue Technologie zu erlernen)
Fabrik bauen (die angrenzenden Gelände bestimmen, welche Maschinenleisten ihr vorantreibt)'),
(209010, 'de', 'Mechs vs. Minions ist eine kooperative Tabletop-Kampagne für 2-4 Spieler. Angesiedelt in der Welt von Runeterra, übernehmen die Spieler die Rollen von vier furchtlosen Yordles: Corki, Tristana, Heimerdinger und Ziggs, die ihre Kräfte bündeln und ihre neu gebauten Mechs gegen eine Armee marodierender Minions steuern müssen. Mit modularen Spielplänen, programmierbaren Befehlszeilen und einer geschichtsgetriebenen Kampagne ist jede Mission einzigartig und stellt eure Teamarbeit, euer Programmier- und Steuerungsgeschick auf die Probe.

Es gibt insgesamt zehn Missionen, und jede einzelne dauert etwa 60-90 Minuten.'),
(28143, 'de', 'In Race for the Galaxy bauen die Spieler galaktische Zivilisationen auf, indem sie Karten spielen, die Welten oder technische und soziale Entwicklungen darstellen.

In jeder Runde wählen die Spieler geheim und gleichzeitig eine Aktionskarte, die einer Phase der Runde entspricht. Diese Phasen erlauben es den Spielern, Karten zu ziehen, Karten zu spielen, Waren zu Welten hinzuzufügen oder Waren gegen SP-Chips zu verbrauchen. Nur die gewählten Phasen finden in dieser Runde statt. Jeder Spieler darf in einer stattfindenden Phase handeln, aber die Spieler, die diese Phase gewählt haben, erhalten einen Bonus.

Das Spielende wird entweder ausgelöst, wenn ein Spieler eine Zivilisation aus 12 Karten aufgebaut hat, oder wenn der Vorrat an SP-Chips erschöpft ist. Jeder Spieler zählt dann die Siegpunkte in seiner Auslage sowie alle im Spielverlauf verdienten SP-Chips zusammen.

Detaillierte Übersicht
Race for the Galaxy erzählt eine Geschichte galaktischer Entdeckung und Expansion durch ein einziges Kartendeck. Jede Karte im Deck stellt entweder eine Welt dar, die ihr besiedeln könntet, oder eine Entwicklung, die ihr umsetzen könntet. Karten in eurer Auslage stellen eure aktuellen Errungenschaften dar - kolonisierte Welten, beherrschte Technologien -, während Karten auf eurer Hand die derzeit verfügbaren Optionen darstellen.

Um eine Karte zu spielen, werft ihr eine Anzahl an Karten ab, die ihren Kosten entspricht, was andere Möglichkeiten darstellt, auf die ihr verzichten müsst, um euch auf euren aktuellen Kurs zu konzentrieren. Einmal in eurer Auslage, bietet eine Karte im Spielverlauf besondere Kräfte und am Ende ihre aufgedruckte Anzahl an Siegpunkten. Viele Welten produzieren, einmal platziert, auch Waren, die gegen weitere Karten eingetauscht oder für SP-Chips verbraucht werden können.

Race for the Galaxy wird in Runden gespielt. In jeder Runde wählen ihr und eure Gegner geheim eine Aktionsphase für den kommenden Zug. Ihr könnt wählen:
• Eine Welt in eurer Auslage platzieren mit Besiedeln oder eine Entwicklung mit Entwickeln.
• Waren auf Welten produzieren mit Produzieren.
• Waren gegen SP verbrauchen mit Verbrauchen.
• Karten zu eurer Hand hinzufügen mit Erkunden oder durch den Handel einer Ware.

In jeder Runde finden nur die gewählten Phasen statt - aber sie finden für alle statt. Die Wahl einer Phase stellt sowohl sicher, dass sie in dieser Runde stattfindet, als auch, dass der wählende Spieler einen Bonus erhält.

Runde folgt auf Runde, bis jemand seine Auslage auf zwölf Karten aufgebaut hat oder bis der letzte SP-Chip beansprucht wird. Der Sieger ist der Spieler mit den meisten SP.

UPDATE 2018
Die zweite Ausgabe des Spiels ist für CVD (Farbenblindheit) verbessert und enthält 5 überarbeitete Karten aus der Originalversion sowie 6 neue Welten-Promo-Heimatwelten. Die Promo-Heimatwelten und die mit der ersten Ausgabe kompatiblen überarbeiteten Karten sind beide über den BGG-Store erhältlich.'),
(55690, 'de', 'Kingdom Death: Monster ist ein vollständig kooperatives Tabletop-Hobby-Spielerlebnis. Angesiedelt in einer einzigartigen, albtraumhaften Welt ohne die meisten natürlichen Ressourcen, kontrolliert ihr eine Siedlung an der Schwelle ihrer Existenz. Kämpft gegen Monster, fertigt Waffen und Ausrüstung, und entwickelt eure Siedlung weiter, um euer Überleben von Generation zu Generation zu sichern.

Kampagnensystem
Begebt euch allein oder mit bis zu 3 Freunden (5 mit Spielvariante) auf eine 5-30-Laternenjahre-Kampagne, wobei jedes Jahr aus einem Zyklus von Jagd-, Showdown- und Siedlungsphasen besteht. Die Siedlungsphase ist ein komplexes Zivilisationsaufbauspiel, in dem ihr sehr begrenzte Ressourcen ausgebt, um Gebäude zu bauen, neue Technologien zu erforschen, eure Krieger auszubilden und eure Überlebensstrategie festzulegen. Während der Jagd erlebt ihr eine Reihe von Geschichten in einem "Wähle dein eigenes Abenteuer"-Stil durch verschiedene Ereignisse und Begegnungen. Trefft ihr schließlich auf das Monster, das ihr verfolgt, liefert ihr euch mit ihm eine gewaltige Arena-Schlacht, bei der nur eine Partei überleben wird. Überlebt eure Gruppe, könnt ihr die Beute mit nach Hause bringen, um eure Siedlung zu erweitern.

Monster-KI-System
Jedes der 7 enthaltenen Monster wird von seinem eigenen Deckpaar gesteuert, das auf 3 Schwierigkeitsstufen skaliert (außer bei der letzten Begegnung, die nur eine Stufe hat, und die ist SCHWER!). Jede Begegnung, selbst mit demselben Monster, ist hochvariabel, und keine zwei Showdowns verlaufen gleich. Die Spieler müssen ihre Ausrüstung planen und ihren Verstand geschärft halten, um zu bestehen.

Ausrüstungssystem
In Kingdom Death: Monster fertigen die Überlebenden Ausrüstung aus Ressourcen, die sie durch das Besiegen von Monstern oder auf der Jagd finden. Jeder Überlebende verfügt über ein 3x3-Ausrüstungsraster. Die Auswahl und Anordnung eurer Ausrüstungskarten ist entscheidend, da viele bereitgestellte Boni und besondere Regeln aktiviert werden, wenn sie korrekt ausgerichtet sind.

Geschichtsereignissystem
Über 40 Geschichtsereignisse plus über 100 Jagdbegegnungen werden eure Kampagne formen und leiten. Geschichtsereignisse beschreiben wichtige Entwicklungen in eurer Zivilisation, führen neue Monster ein und liefern detailreiche Hintergründe für eure Kampagne. Manche werden automatisch ausgelöst, während ihr in der Kampagne voranschreitet, aber die meisten hängen vollständig von den Entscheidungen der Spieler ab.

Geschichtsereignisse decken alles ab, vom Vorbereiten und Bekämpfen eines Monsters bis zu Schlüsselereignissen, die innerhalb der Gesamtgeschichte geschehen. Manche werden direkt durch die Zeitleiste ausgelöst, andere durch Entscheidungen, die ihr im Spiel trefft.'),
(284083, 'de', 'Im kooperativen Stichspiel The Crew: The Quest for Planet Nine brechen die Spieler als Astronauten zu einem ungewissen Weltraumabenteuer auf. Was hat es mit den Gerüchten über den unbekannten Planeten auf sich? Die ereignisreiche Reise durch den Weltraum erstreckt sich über 50 spannende Missionen. Doch dieses Spiel kann nur bewältigt werden, indem gemeinsame individuelle Aufgaben jedes Spielers erfüllt werden. Um den vielfältigen Herausforderungen zu begegnen, ist Kommunikation im Team essenziell. Doch das ist im Weltraum schwieriger als erwartet.

Mit jeder Mission wird das Spiel schwieriger. Nach jeder Mission kann das Spiel pausiert und später fortgesetzt werden. Während jeder Mission zählt nicht die Anzahl der Stiche, sondern die richtigen Stiche zur richtigen Zeit.

Das Team schließt eine Mission nur ab, wenn jeder einzelne Spieler seine Aufgaben erfolgreich erfüllt.

Das Spiel enthält 50 Missionen, mit drei zusätzlichen Missionen, veröffentlicht in spielbox 2/2020.'),
(277659, 'de', 'Als Hommage an einen berühmten Horrorfilm-Topos ist Final Girl ein reines Solospiel, das die Spielerin in die Rolle einer weiblichen Protagonistin versetzt, die den Slasher töten muss, wenn sie überleben will.

Die Grundbox bietet zusammen mit einer der Feature-Film-Boxen alles, was ihr zum Spielen braucht. Jede Feature-Film-Box zeigt einen einzigartigen Killer und einen ikonischen Schauplatz, und je mehr Feature Films ihr habt, desto mehr Killer-Schauplatz-Kombinationen könnt ihr erleben!

Spielmechanisch teilt Final Girl Ähnlichkeiten mit Hostage Negotiator, mit einigen entscheidenden Unterschieden, darunter ein Spielplan zur Verfolgung von Orten und Charakterbewegung. Ihr könnt aus mehreren Charakteren wählen, wenn ihr auswählt, wen ihr spielt, und aus mehreren Killern, wenn ihr auswählt, gegen wen ihr spielt. Killer und Schauplätze haben jeweils eigene Terrorkarten, die zusammengemischt werden, um mit verschiedenen Szenario-Kombinationen ein einzigartiges Erlebnis für euch zu schaffen!

HINWEIS: Das Kickstarter-Projekt 2022 für Final Girl: Season 2 enthielt ein 13-Karten-Korrekturpaket für den ersten Druck von Final Girl: Series 1. Die Karten korrigieren größtenteils Tippfehler und werden zum Spielen nicht benötigt. Sie wurden für den zweiten Druck von Final Girl: Series 1 korrigiert.

- Beschreibung des Verlags'),
(157354, 'de', 'Auf dem Weg ins Land der 1001 Nacht erreicht eure Karawane das legendäre Sultanat Naqala. Der alte Sultan ist gerade gestorben, und die Kontrolle über Naqala steht zur Debatte! Die Orakel prophezeiten, dass Fremde kommen würden, die die Fünf Stämme lenken, um Einfluss über die legendäre Stadtstaat zu gewinnen. Werdet ihr die Prophezeiung erfüllen? Beschwört die alten Djinns und bewegt die Stämme zur richtigen Zeit an die richtige Position, und das Sultanat könnte euer werden!

Entworfen von Bruno Cathala, baut Five Tribes auf einer langen Tradition deutscher Spiele auf, die hölzerne Meeples verwenden. Hier, in einer einzigartigen Abwandlung des mittlerweile etablierten "Arbeitereinsatz"-Genres, beginnt das Spiel mit den bereits platzierten Meeples - und die Spieler müssen sie geschickt über die Dörfer, Märkte, Oasen und heiligen Stätten manövrieren, aus denen Naqala besteht. Wie, wann und wo ihr diese Fünf Stämme der Assassinen, Ältesten, Bauleiter, Kaufleute und Wesire verschiebt, bestimmt euren Sieg oder eure Niederlage.

Wie es sich für ein Days-of-Wonder-Spiel gehört, sind die Regeln unkompliziert und leicht zu erlernen. Doch eine erfolgreiche Strategie zu entwickeln, erfordert einen kalkulierteren Ansatz als bei unseren gewöhnlichen Spielen. Ihr müsst sorgfältig abwägen, welche Züge euch gut punkten lassen und eure Gegner benachteiligen. Ihr müsst viele verschiedene Wege zum Sieg abwägen, einschließlich der Beschwörung mächtiger Djinns, die eurem Vorhaben helfen können, während ihr versucht, dieses legendäre Sultanat zu beherrschen.'),
(230802, 'de', 'Von den Mauren eingeführt, wurden Azulejos (ursprünglich weiß-blaue Keramikfliesen) von den Portugiesen vollständig übernommen, als ihr König Manuel I. bei einem Besuch des Alhambra-Palasts in Südspanien von der atemberaubenden Schönheit der maurischen Zierkacheln fasziniert war. Der König, überwältigt von der inneren Schönheit der Alhambra, ordnete sofort an, dass sein eigener Palast in Portugal mit ähnlichen Wandfliesen geschmückt werden sollte. Als Fliesenlege-Künstler seid ihr aufgefordert, die Wände des Königspalasts von Évora zu verschönern.

Im Spiel Azul draften die Spieler abwechselnd farbige Fliesen von Anbietern auf ihr Spielertableau. Später in der Runde erhalten die Spieler Punkte, je nachdem, wie sie ihre Fliesen zur Verschönerung des Palasts platziert haben. Zusätzliche Punkte gibt es für bestimmte Muster und das Vervollständigen von Sets; verschwendete Vorräte schaden der Punktzahl des Spielers. Der Spieler mit den meisten Punkten am Spielende gewinnt.'),
(359871, 'de', 'Arcs ist ein scharfsinniges, taktisches Weltraumopern-Spiel, angesiedelt in einem dunklen, aber verschrobenen Universum. Die Spieler verkörpern Beamte eines fernen, verfallenden und vernachlässigenden Imperiums, die nun frei sind, um die Vorherrschaft zu ringen - sei es durch Kampf, das Sammeln knapper Ressourcen oder diplomatische Intrigen. Macht euch bereit für dramatische Wendungen, während ihr euch in diesen galaktischen Kampf stürzt.

Ein Kartendeck mit 4 Farben und Rängen von 1-7 (2-6 bei weniger als 4 Spielern) definiert das Aktionsauswahlsystem. Diese Karten werden in einem stichspielähnlichen System gespielt, um Aktionen auszuwählen, die Initiative zu übernehmen und Ambitionen zu erklären. Die 3 erklärten Ambitionen sind es, die in diesem Durchgang gewertet werden. Timing ist alles. Schlechte Blätter müssen durch sorgfältiges Kartenspiel abgemildert werden und davon profitieren, wie andere Spieler ihre Karten ausspielen.

Schlachten werden schnell aufgelöst, wobei der Angreifer sein Risikoniveau wählt. Die Verteidiger müssen mit ausreichenden Verteidigungsschiffen und Karten in ihrer Auslage vorbereitet sein.

Jedes Spiel enthält hundert Holzschiffe und Agenten, 18 individuell gravierte Würfel, ein wunderschönes sechsteiliges Spielbrett und jede Menge Karten mit über 60 einzigartigen Kunstwerken. Das Grundspiel kann ohne die optionalen Anführer- und Legendenkarten gespielt werden (für ein einfacheres Erlernen) oder mit ihnen für ein reicheres, volleres und asymmetrisches Spiel. Es bildet zudem den Kern des Kampagnenspiels (das die Blighted-Reach-Erweiterung erfordert), das ein episches, thematischeres Erlebnis bietet.'),
(400495, 'de', 'JinxO ist ein kompetitives Wortassoziationsspiel.
Das Ziel: die meisten Punkte erzielen, indem ihr Antworten aufschreibt, die mit anderen Personen in der Gruppe übereinstimmen. Seid vorsichtig mit euren Worten! Stimmt eure Antwort mit niemandem in der Gruppe überein, erhaltet ihr keine Punkte. Stimmt jedoch nur eine weitere Person mit euch überein, JINX! Ihr erzielt mehr Punkte - das ist ein JinxO!'),
(456440, 'de', 'Erkundet das Land, deckt Geheimnisse auf und verfolgt die persönlichen Geschichten eurer Bewohner. Baut euer Dorf mit über 800 Stickern von Häusern, Farmen, Läden, Tieren und vielem mehr! Während euer Dorf wächst, wachsen auch eure Möglichkeiten: Geht angeln, erkundet die Mine, findet die wahre Liebe und mehr!

Erschafft euer Vermächtnis, während eure Entscheidungen neue Möglichkeiten freischalten und bleibende Auswirkungen auf zukünftige Partien haben können. Die von euch gewählten Gebäude haben einzigartige Effekte, und jede Entscheidung schafft in den folgenden Jahren neue Möglichkeiten.

Erkundet und entdeckt, während ihr Bewohnern bei ihren persönlichen Geschichten helft, angeln geht, die Mine erkundet und verborgene Geheimnisse aufdeckt.

Ein Spiel für jeden!

- Beschreibung des Verlags'),
(462742, 'de', 'Die 2 bis 4 angehenden Sortiermeister müssen die Zutatengläser geschickt in den Regalen anordnen. Im Wettstreit um die Gunst des Ladenbesitzers füllen die jungen magischen Talente nach und nach ihr eigenes Regalbrett, das aus drei Reihen besteht, mit einem Zutatenglas aus der für die Runde gezogenen Auswahl.

Alle wählen abwechselnd ein Plättchen.

Es gelten strenge, aber einfache Regeln: Die Deckelfarbe bestimmt, in welches Regal das Glas gestellt werden darf, während die Zahlen in jeder Reihe aufsteigend sortiert sein müssen.

Die magischen Kätzchen und besondere, im Spielverlauf gewonnene Gläser verschaffen den Spielern kleine, aber bedeutsame Vorteile beim Einräumen der Regale.

So füllen sich die Regale langsam, aber sicher, bis der Beutel mit Zutatengläsern leer ist. Dann kommt der Moment der Wahrheit für die Lehrlinge: Wer hat seine Regale am geschicktesten organisiert und die meisten Sternpunkte durch passende Zutaten, vollständige Regalreihen, Wertungsrollen und Abzeichen gesammelt?

Wertungsregeln:
Für jede Zutat erhaltet ihr gemäß der Tabelle Punkte, abhängig von der Anzahl eurer Plättchen.'),
(446497, 'de', 'Hot Streak ist ein Spiel für Pechvögel unter den Zockern, die es lieben, auf die Rennfahrer zu wetten und sie anzufeuern - die in diesem Fall zufällig Maskottchen sind, die möglicherweise (oder auch nicht) in die richtige Richtung weiterlaufen.

Zu Spielbeginn wird das Rennkartendeck mit einer Karte pro Maskottchen sowie einer Reihe zufälliger Karten je nach Spielerzahl zusammengestellt. Diese Karten werden allen Spielern gezeigt, danach draften die Spieler ein Wettticket aus den ausliegenden, dann in umgekehrter Reihenfolge eine zweite Wette. Für jede Wette könnt ihr auf Nummer sicher gehen - oder sie auf die riskante Seite drehen, was mehr auszahlen könnte, oder euch Geld kosten kann, wenn ihr verliert. Nach dem Wetten wählt jeder Spieler eine von drei Karten auf der Hand, um sie heimlich zum Rennkartendeck hinzuzufügen.

Mischt das Deck, verbrennt drei Karten, dann deckt die Karten nacheinander vom Deck auf und bewegt die Maskottchen die Strecke entlang - dabei schwenken sie manchmal in eine andere Spur und werfen einen anderen Rennfahrer um, drehen sich manchmal um, bewegen sich manchmal alle gleichzeitig, und manchmal geht es einfach nur rückwärts! Verlässt ein Rennfahrer die Strecke oder würde er umgeworfen, während er bereits gestürzt ist, wird er disqualifiziert. Falls nötig, mischt alle Karten im Deck, verbrennt erneut drei Karten und rennt weiter, bis alle vier Plätze auf dem Podium der Schachtel besetzt sind. Zahlt die Wetten basierend auf diesen Ergebnissen aus.

Für die Rennen #2-3 teilt zunächst jedem Spieler eine zufällige Karte vom Deck aus, platziert dann erneut Wetten, dann trägt jeder Spieler eine Karte aus seiner Hand zum Deck bei. Nach Rennen #3 zählt jeder sein Geld zusammen.'),
(447384, 'de', 'In Meister Makatsu konkurrieren die Spieler mit ihren Ninjas um die Gunst des berühmten Meisters, indem sie ihre Beherrschung von perfektem Timing und strategischen Zügen unter Beweis stellen.

Jeder hat sein eigenes Deck aus 24 Karten, nummeriert 1-8 in drei Farben. Ihr müsst diese Karten über drei Runden hinweg klug einsetzen, denn in jedem Zug erhält derjenige, der die höchste Karte einer Farbe spielt, Punkte in Höhe der Rundennummer. Gespielte Karten werden aus dem Spiel entfernt, während nicht gespielte Handkarten in euer Deck zurückkehren, um in nachfolgenden Runden genutzt zu werden.

Am Ende gewinnt, wer die wenigsten Punkte hat.'),
(440540, 'de', 'Take Time ist ein kooperatives Spiel, bei dem die Spieler gemeinsam gewinnen oder verlieren.

Um erfolgreich zu sein, müsst ihr strategisch 12 Karten verdeckt um eine Uhr herum ausspielen und dabei die spezifischen Regeln jeder Prüfung befolgen. Ihr könnt gemeinsam über eine Reihe von Partien hinweg alle 40 im Spiel enthaltenen Prüfungen bestehen.

- Beschreibung des Verlags'),
(417403, 'de', 'Es ist das 19. Jahrhundert. Ihr seid jugendliche Mitglieder der ersten wissenschaftlichen Expedition zur halb-legendären, unbewohnten Insel Toriki. Gerade als ihr euer Ziel erreichen wollt, gerät euer Schiff in einen Sturm und zerschellt an Unterwasserfelsen. Mit den letzten Kräften schwimmt ihr an Land, und dort beginnt euer Abenteuer! Habt ihr das Zeug dazu, den Herausforderungen einer einsamen Insel zu trotzen?

Toriki: The Castaway Island ist ein kooperatives Familienspiel voller Abenteuer, Erkundung und Überleben. Mithilfe der Scan-&-Play-Technologie, die digitale Elemente mit einem traditionellen Brettspiel verbindet, bietet es ein immersives, interaktives Erlebnis mit wunderschön illustrierten Komponenten. Durchsucht die Insel nach Ressourcen, fertigt neue Werkzeuge, entdeckt der Wissenschaft unbekannte Arten und gebt ihnen Namen! Vor allem aber müsst ihr euer Überleben sichern und einen Weg nach Hause finden!

Das Spiel wird als ein einziges, fortlaufendes Abenteuer gespielt, das etwa 6-8 Stunden dauert, kann aber jederzeit pausiert und gespeichert werden.

- Beschreibung des Verlags'),
(434654, 'de', 'An Land, auf See, in Wolken und sogar im Weltraum brechen Schlachten zwischen Spielzeugen aus. Eure Truppen brauchen euer taktisches Talent, um sie zum Sieg zu führen. Eure Mission? Seid die Ersten, die das gegnerische Hauptquartier erreichen, oder kontrolliert mehr Gebiete als euer Gegner.

In eurem Zug in Toy Battle zieht ihr entweder zwei Spielzeugtruppen oder platziert eine Truppe auf dem Spielplan und wendet ihren Effekt an. Wenn ihr eine Truppe platziert, könnt ihr sie auf einer leeren Basis, einer von euch kontrollierten Basis, einer vom Gegner kontrollierten Basis mit einer niedrigerwertigen Truppe als der platzierten oder auf dem gegnerischen Hauptquartier platzieren; in jedem Fall müsst ihr jedoch an einem Ort platzieren, der über eine durchgehende Verbindung zu eurem eigenen Hauptquartier verfügt, über Basen, die ihr besetzt, also solche, auf denen eure Truppe obenauf liegt. Besetzt ihr Basen, die einen durchgehenden Pfad um eine Region bilden, beansprucht ihr die Medaillen innerhalb dieser Region. (Ihr verliert diese Medaillen nicht, wenn der Gegner später eine dieser Basen besetzt.)

Das Spiel endet, sobald ihr das Hauptquartier eures Gegners besetzt oder die erforderliche Anzahl an Medaillen basierend auf dem aktuellen Spielplan gewinnt. Kann ein Spieler weder ziehen noch platzieren, endet das Spiel, und wer die meisten Medaillen hat, gewinnt.

- Beschreibung des Verlags'),
(424975, 'de', 'In Wilmot''s Warehouse arbeitet euer Team kooperativ zusammen, um das Lager zu organisieren - mit Gedächtnis, Fantasie und albernen Geschichten, die ihr euch ausdenkt.

Zieht Produktplättchen vom Stapel, besprecht, wie sie aussehen, und legt sie an einen Ort, den ihr euch merken werdet. Nachdem ihr jedes Plättchen platziert habt, dreht ihr es um und dürft es bis zum Spielende nicht mehr ansehen - euer Team muss sich also merken, wo ihr frühere Plättchen platziert habt, während ihr entscheidet, wo neue hinkommen.

Am Ende des Spiels muss euer Team in einem fünfminütigen Endspurt alle 35 verdeckten Plättchen mit Kundenkarten abgleichen. Schaut in eure Leistungsbeurteilung, um zu sehen, wie gut ihr abgeschnitten habt!

- Beschreibung des Verlags'),
(417197, 'de', 'Nach einer Reihe von Katastrophen, die die Zivilisation in Trümmern zurückließen, werden Gesellschaften auf der ganzen Welt im Einklang mit der Natur neu aufgebaut. Schottland liegt in Trümmern, und die alten Clans haben es sich zur Aufgabe gemacht, das Land wiederherzustellen. Als Clanoberhäupter konkurriert ihr um die strategische Kontrolle über das Land, indem ihr seine prestigeträchtigen Burgen wieder aufbaut.

Rebirth ist ein neues Plättchenlegespiel von Reiner Knizia. Das Spiel belebt dieses klassische Genre neu, indem es Knizias elegante Mechanismen mit der stimmungsvollen Weltgestaltung von Mighty Boards verbindet. Das Ergebnis ist ein Euro-Spiel mit flüssigem Spielgefühl, angesiedelt in einer üppigen und hoffnungsvollen Zukunft.

In jedem Zug ziehen die Spieler ein Plättchen aus ihrem Vorrat und platzieren es strategisch auf dem Spielplan. Diese Plättchen stellen den Beitrag eures Clans zum Wiederaufbau des Landes dar. Rebirth belohnt strategische Weitsicht und geschicktes taktisches Spiel, wobei die Entscheidungen im Spielverlauf zunehmend schwieriger werden.

- Beschreibung des Verlags'),
(454672, 'de', 'Stürzt euch in gewagte Kämpfe mit 2 bis 4 Helden, während ihr euch zehn einzigartigen und intelligenten Bossmonstern stellt! Das Besondere: Alle Bosse werden von einer App gesteuert, die dynamisch auf eure Aktionen reagiert. Zu Beginn jedes Kampfes bleiben ihre Taktiken und Fähigkeiten ein Rätsel. Deckt ihre Schwächen auf, findet heraus, wie ihr sie besiegt, und sichert euch mächtige Beutekarten, um euer Deck aufzuwerten und neue Fähigkeiten freizuschalten!

Boss Fighters QR ist ein kooperatives Fantasy-Kampagnenspiel, in dem die Spieler gegen zehn einzigartige Bossmonster kämpfen, die taktisch auf ihre Aktionen reagieren. Dieses Hybridspiel verbindet Elemente eines klassischen Kartenspiels mit einer digitalen App, um ein Zusammenspiel aus strategischem Deckbau und dynamischen Bosskämpfen zu schaffen. Der Scan-&-Play-Mechanismus von Boss Fighters QR ermöglicht es dem Spiel, Spielerkarten beim Scannen sofort zu erkennen, was dann in Echtzeit herausfordernde Reaktionen auf die Entscheidungen der Spieler auslöst.

Zu Kampagnenbeginn wählt jeder Spieler ein Heldendeck - Dschungeltroll, Hügelhalbling, Kupferzwerg oder Waldelf - und kombiniert es mit einer der vier verfügbaren Klassen: Krieger, Magier, Schurke oder Druide. Jeder Boss verfügt über eigene Taktiken und Fähigkeiten, Stärken und Schwächen, die die Heldengruppe zunächst erschließen und verstehen muss, bevor sie effektiv gegen ihn kämpfen kann. Nach dem erfolgreichen Besiegen eines Bosses erhalten die Spieler Beutekarten, versteckt in drei geheimen Beutekisten, mit denen sie ihre Decks verbessern und neue, mächtige Fähigkeiten freischalten können. Jeder Bosskampf kann auf einer von vier Schwierigkeitsstufen versucht werden.

- Beschreibung des Verlags'),
(425549, 'de', 'Städte auf dem Mond! Dies wird die krönende Leistung der Menschheit sein. Endlich nicht mehr an die Erde gebunden - der Mond, ein Sprungbrett zu den Sternen. Die Raketen sind mit Vorräten und Kolonisten beladen; die Roboter sind programmiert und bereit. Alles wurde bis ins kleinste Detail geplant, und es besteht absolut keine Möglichkeit des Scheiterns. Auf zum Mond!

Moon Colony Bloodbath ist ein Engine-Building-, Engine-Losing-Auslagenspiel mit einem gemeinsamen Deck, das die Spieler aufbauen und das Dinge geschehen lässt - viele davon schlechte Dinge, die Menschen in eurer Mondkolonie töten, aber manche auch positiv, und manche, die euch aufbauen lassen.

Genauer gesagt wird jeden Zug eine Karte vom gemeinsamen Deck aufgedeckt, das mit vier Arbeitskarten, zwei Problemkarten und zwei Wendungen beginnt. Für Arbeit führt jeder Spieler gleichzeitig eine Aktion seiner Wahl aus: Bergbau für Geld, Landwirtschaft für Nahrung, Forschung für Karten, ein neues Gebäude bauen oder Kisten an Gebäuden auffüllen. Wendungen variieren von Partie zu Partie. Probleme fügen dem Deck eine neue Ereigniskarte hinzu: Hunger, Papierkram, Störungen, Unfälle, Lecks, Stromausfall - alles, was schiefgehen kann, geht schief, und wann immer das Deck gemischt wird, könnt ihr euch erneut auf all diese Ereignisse vorbereiten.

Spieler können ebenfalls Karten zum gemeinsamen Deck hinzufügen, sei es Vorteile nur für sich selbst oder Entwicklungen, die alle Spieler betreffen.

Das Spiel dauert, bis in der Mondkolonie eines Spielers keine Menschen mehr übrig sind oder bis die Spieler den Boden des Ereignisdecks erreichen. Zu diesem Zeitpunkt gewinnt der Spieler mit den meisten Überlebenden.'),
(441696, 'de', 'In Sanctuary plant und gestaltet ihr einen modernen, wissenschaftlich geführten Zoo für Tiere und Besucher. Ein Vorrat von 135 einzigartigen Zooplättchen liefert euch Tiere, Gebäude und Projekte. In jeder Partie wollt ihr die beste Mischung aus den verfügbaren Elementen finden, um die erfolgreichste zoologische Einrichtung aufzubauen. Verschiedene Effekte auf den Plättchen helfen euch, Artenschutzziele zu erreichen und die Attraktivität eures Zoos zu steigern.

Jeder Spieler verfügt über vier Aktionskarten zur Steuerung seines Spielzugs, wobei die Stärke einer Aktion durch den Platz bestimmt wird, den die Karte gerade einnimmt. Eine dieser Karten erlaubt es euch, Projekte zu spielen, die anderen drei erlauben es euch, Tiere eines bestimmten Habitats zu spielen: Wald, Fels oder Wasser.

Sanctuary basiert auf seinem Vorgänger Ark Nova, verändert und vereinfacht jedoch viele der Mechanismen dieses Spiels auf elegante und überraschende Weise. Euer Ziel, den besten Weg zu finden, eure Tiere, Gebäude und Projekte auf eurer Zookarte zusammenzupuzzeln, ist ein anhaltendes Vergnügen!

- Beschreibung des Verlags'),
(449853, 'de', 'Willkommen bei Frosted Blooms

In der sanften Morgendämmerung eines niederländischen Frühlings hängt der letzte Atemzug des Winters noch in der Luft und hinterlässt einen zarten Frost auf den erwachenden Feldern. Doch unter dieser schimmernden Kälte beginnen kühne Tulpen zu blühen - lebendig, farbenfroh und voller Verheißung.

Ihr seid einer der Mistergärtner, die darum wetteifern, den bewundertsten Tulpengarten der Saison zu erschaffen. Jede Entscheidung, die ihr trefft, jede Landschaft, jede errichtete Windmühle und jede sorgfältig arrangierte Blume bringt euch der Perfektion näher.

Plant sorgfältig, kultiviert mit Stil, und lasst euren Tulpenteppich als Stolz der Niederlande erstrahlen!

In Frosted Blooms wetteifern die Spieler darum, über 10 Runden hinweg den harmonischsten und wertvollsten Tulpengarten zu erschaffen.

In jedem Zug werdet ihr:

Ein Landschaftsplättchen vom Markt wählen,

Es zu eurem Garten hinzufügen,

Eine Landschaftskarte aus eurer Hand spielen, um basierend auf Mustern zu punkten.

Und wenn ihr leere Flächen umschließt, füllt sie mit Arbeitern, Scheunen oder Windmühlen für große Boni am Spielende.

Indem ihr bestimmte Gruppen in eurem Garten bildet und bestimmte Elemente hinzufügt, könnt ihr Ziele erfüllen, die am Spielende zusätzliche Punkte einbringen. Am Ende der 10 Runden gewinnt der Spieler mit den meisten Punkten das Spiel!

- Beschreibung des Verlags'),
(412865, 'de', 'In Foundations of Metropolis wetteifern die Spieler über drei Runden darum, der größte Architekt der Stadt zu werden, indem sie Grundstücksurkunden für leere Parzellen erwerben und darauf neue Gebäude errichten.

Komplexere Gebäude erfordern mehr Parzellen, bringen aber noch größeres Prestige ein. Der Spieler mit dem meisten Prestige wird zum Großarchitekten ernannt!

Das Spielgefühl ist in diesem eigenständigen Spiel dasselbe wie in Foundations of Rome, jedoch mit Polyomino-Teilen und einem völlig neuen Thema.

- Beschreibung des Verlags'),
(434906, 'de', 'Inspiriert von klassischen Arcade-Kampfspielen ist Tag Team ein Auto-Battler kombiniert mit einem Deckbauspiel. Stellt euer Team aus zwei Kämpfern aus den zwölf verfügbaren zusammen - jeder mit eigenen Techniken und Spezialmoves - und baut eine unschlagbare Synergie auf, indem ihr ihre beiden einzigartigen Decks kombiniert!

Genauer gesagt beginnt ihr mit einem Deck aus nur zwei Karten, und der Kampf entfaltet sich automatisch: Deckt eure Karten nacheinander auf und wendet ihre Effekte an. Am Ende jeder Runde dürft ihr dem gegnerischen Team einheizen, indem ihr strategisch neue Karten hinzufügt, um euer Deck zu programmieren - allerdings ohne die Reihenfolge der bereits vorhandenen Karten zu verändern. Bestimmt, was euer Tag Team ausmacht, spielt verheerende Kombos und dominiert euren Gegner, indem ihr seine Angriffe geschickt blockiert. Timing ist alles, wenn ihr siegreich hervorgehen und euren Gegner niederstrecken wollt!

AUSZEICHNUNGEN -
2026 - Dice Tower - Bestes Zweispielerspiel
2025 - Best of Gen Con 2025'),
(435346, 'de', 'Begebt euch auf ein Abenteuer, um die entzückendsten Kreaturen zu treffen: die Mookies!

Mooki Island ist ein schnelles, fesselndes Spiel, in dem ihr so viele Mookies wie möglich aus jeder Familie sammelt, um Trophäen zu gewinnen! Könnt ihr die glänzenden legendären Mookie-Karten ergattern? Und vor allem: Hütet euch vor der seltsam aussehenden Spinne, die nur darauf wartet, euch einen Streich zu spielen!

Die einfachen Regeln des Spiels (jeder Spieler nimmt eine Karte und legt sie vor sich ab) helfen jüngeren Spielern zu entdecken, wie ein Mehrheitssammelspiel funktioniert. Während sie immer wieder spielen, werden sie nach und nach zu gewitzten kleinen Strategen, bereit, ihre Eltern zu überraschen!

Aber das ist noch nicht alles! Erkundet nach jeder Partie gemeinsam mit eurem Poster die Insel und benennt die Mookies, mit denen ihr euch angefreundet habt. Lumilion, Dracoleaf, alle Namen sind gut!

AUSZEICHNUNGEN -
- Bestes Kinderspiel, 2026 As d''Or
- Kinderspiel des Jahres 2026 Gewinner

- Beschreibung des Verlags'),
(454722, 'de', 'Die Kostümparty ist in vollem Gange!
Doch MONSTER verstecken sich unter den Verkleidungen ...
Zum Glück ist die Seherin hier, um sie zu enttarnen!
Welche Rolle werdet ihr spielen?

Als MONSTER wählt euer Kostüm mit Bedacht, um verborgen zu bleiben und nicht von der Seherin erwischt zu werden!

Als SEHERIN merkt euch, welche Kostüme bereits getragen wurden, um die vergesslichen Monster zu enttarnen!

Boo Party ist ein Spiel voller schräger Kostüme und Versteckspiel-Nervenkitzel!

- Beschreibung des Verlags'),
(420360, 'de', 'Die Früchte im Garten verschwinden! Mimose, Sam und ihr Freund versuchen herauszufinden, wer oder was sie stiehlt!

In diesem einzigartigen Eins-gegen-alle-Deduktionsspiel für Kinder und Familien ab 5 Jahren spielen die Spieler Detektive, sammeln Hinweise, schließen Verdächtige aus und versuchen, die Person zu finden, die all ihre schönen Früchte gestohlen hat.

EIN Spieler spielt den Früchtedieb, der versucht, alle perfekten Früchte zu finden und unentdeckt nach Hause zu laufen, rechtzeitig, um morgen für alle einen Kuchen für Mimoses Geburtstagsfeier zu backen.

Der Dieb muss aufpassen, keine allzu guten Hinweise zu hinterlassen, die den Detektiven helfen könnten, ihn zu identifizieren. Die Detektive wiederum müssen kooperieren, ihre Würfel teilen, den Hinweisen folgen und ihre Züge sorgfältig planen, um zu gewinnen.

Basierend auf der Kinderbuchreihe Mimose & Sam, erschienen bei Comme des Géants, geschrieben und illustriert von Cathon.

- Beschreibung des Verlags'),
(425078, 'de', 'You Little Stinker ist ein einfaches Bilderzuordnungsspiel, das speziell für kleine Kinder entwickelt wurde. Es verfügt über einen hundeförmigen Würfelbecher, der es kleinen Händen leicht macht, zu schütteln und zu würfeln.

Um zu spielen, legt die Würfel in den Hundebecher, schüttelt ihn und würfelt. Ordnet eure Würfel den Bildkarten zu. Knochen bringen großes Glück, aber die Spieler müssen sich vor stinkenden Schlammpfützen in Acht nehmen. Ein paar glückliche Würfe und ein paar kluge Entscheidungen bringen euch zum Sieg!

- Beschreibung des Verlags'),
(424581, 'de', 'Welche Wunder verbergen sich in diesen kuriosen Bildern? Ist das ein kauernder Löwe? Oder ein scheues Kaninchen? Oder ist es beides? Findet heraus, wer auf der anderen Seite des Spiegels wartet! Verwandelt Hälften mit Hilfe von Spiegelkarten in ein Ganzes: Eine geschwungene Linie entpuppt sich bei genauerem Hinsehen als reife Aubergine, und ein lustiger Schnörkel ist eigentlich eine riesige Palme. Spielt gegeneinander oder in Teams: Wer zuerst 10 Objekte findet, gewinnt!

In Half-and-Seek sind verschiedene Objekte auf den großen, bunten Karten versteckt ... Die Spieler müssen sie jedoch nur anhand ihrer Hälften erkennen!
Sucht mit Hilfe eines Spiegels nach verborgenen Objekten auf dem Bild und seid die Ersten, die 10 kleine Karten sammeln.

- Beschreibung des Verlags'),
(464279, 'de', 'Schaut nach oben! Euer Freund Lino, das Mammut, hat Holz, Steine, Beeren und sogar seltene Kristalle gefunden! Es klappert und rasselt, während er sie den Berg hinunterrollt. Arbeitet zusammen, um ein kleines Dorf zu bauen, bevor Lino müde wird!

Mit Paleolino können Kinder nun in die aufregende Welt von Paleo eintauchen, dem Kennerspiel des Jahres 2021. Es ist ein kooperatives Abenteuer für bis zu 4 Kinder ab 5 Jahren.

Die Spieler arbeiten zusammen, um zehn Erfindungen zu bauen. Dafür müssen sie die benötigten Ressourcen sammeln. Am Zug eines Spielers gelangen neue Ressourcen ins Spiel, indem er den Schüttelbecher schüttelt und einen Ressourcenchip zieht. Der Chip wird in einen 3D-Berg fallen gelassen, wo er hinunterpurzelt und in einer von vier Schubladen landet, den sogenannten Höhlen. Eine Höhle muss geöffnet werden - doch enthält sie die Ressourcen, die ihr braucht, oder müsst ihr euch auf die Hilfe eurer Mitspieler verlassen?

- Beschreibung des Verlags');
